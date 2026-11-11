import { ItemEstoque } from '@domain/entities/item-estoque.entity';
import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import { SagaInstancia, SagaPassoLog } from '@domain/entities/saga.entity';
import { IInboxRepository } from '@domain/repositories/inbox.repository';
import { IItemEstoqueRepository } from '@domain/repositories/item-estoque.repository';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IOutboxRepository, NewOutboxEntry, OutboxEntry } from '@domain/repositories/outbox.repository';
import { ISagaRepository, SagaConcurrencyError } from '@domain/repositories/saga.repository';
import {
  IStatusHistoricoRepository,
  StatusHistoricoEntry,
} from '@domain/repositories/status-historico.repository';
import { InventoryService } from '@domain/services/inventory.service';
import { IUnitOfWork } from '@domain/services/unit-of-work';
import { SagaOrchestrator } from '@application/saga/saga-orchestrator';
import { SagaConfig } from '@application/saga/saga-config';
import { ValidationError } from '@shared/errors/domain.error';
import { Envelope, createEnvelope } from '@shared/messaging/envelope';
import { MessageType } from '@shared/messaging/messages';

/** UoW de teste com rollback de verdade: snapshot dos repositórios em memória. */
export class FakeUow implements IUnitOfWork {
  constructor(private readonly stores: { snapshot(): () => void }[]) {}
  private depth = 0;
  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.depth > 0) return work();
    const restores = this.stores.map((s) => s.snapshot());
    this.depth++;
    try {
      return await work();
    } catch (error) {
      restores.forEach((r) => r());
      throw error;
    } finally {
      this.depth--;
    }
  }
}

export class FakeOrdens implements IOrdemServicoRepository {
  map = new Map<string, OrdemServico>();
  async save(os: OrdemServico) { this.map.set(os.id, os); }
  async update(os: OrdemServico) { this.map.set(os.id, os); }
  async findById(id: string) { return this.map.get(id) ?? null; }
  async findByNumeroOS() { return null; }
  async findByClienteId() { return { ordens: [], total: 0 }; }
  async list() { return { ordens: [], total: 0 }; }
  async nextSequence() { return 1; }
  snapshot() { const c = new Map(this.map); return () => { this.map = c; }; }
}

export class FakeSagas implements ISagaRepository {
  map = new Map<string, SagaInstancia>();
  logs: SagaPassoLog[] = [];
  /** Força uma colisão de versão na próxima atualização. */
  falharProximaAtualizacao = false;
  async create(s: SagaInstancia) { this.map.set(s.id, structuredClone(s)); }
  async findByOrdemServicoId(id: string) {
    const s = [...this.map.values()].find((x) => x.ordemServicoId === id);
    return s ? structuredClone(s) : null;
  }
  async update(s: SagaInstancia) {
    const atual = this.map.get(s.id);
    if (this.falharProximaAtualizacao || !atual || atual.versao !== s.versao) {
      this.falharProximaAtualizacao = false;
      throw new SagaConcurrencyError(s.id);
    }
    const novo = { ...structuredClone(s), versao: s.versao + 1 };
    this.map.set(s.id, novo);
    return structuredClone(novo);
  }
  async findExpired(now: Date, limit: number) {
    return [...this.map.values()]
      .filter((s) => s.expiraEm && s.expiraEm <= now && ['EM_ANDAMENTO', 'COMPENSANDO'].includes(s.status))
      .slice(0, limit)
      .map((s) => structuredClone(s));
  }
  async appendLog(e: SagaPassoLog) { this.logs.push(e); }
  async listLog(id: string) { return this.logs.filter((l) => l.sagaId === id); }
  snapshot() {
    const m = structuredClone(this.map); const l = [...this.logs];
    return () => { this.map = m; this.logs = l; };
  }
}

export class FakeOutbox implements IOutboxRepository {
  entries: NewOutboxEntry[] = [];
  async enqueue(e: NewOutboxEntry) { this.entries.push(e); }
  async claimBatch(_limit: number): Promise<OutboxEntry[]> { return []; }
  async markPublished(_id: string) {}
  async markFailed(_id: string, _error: string, _retryAt: Date) {}
  snapshot() { const c = [...this.entries]; return () => { this.entries = c; }; }
  ofType(type: string) { return this.entries.filter((e) => e.envelope.type === type).map((e) => e.envelope); }
  get types() { return this.entries.map((e) => e.envelope.type); }
}

export class FakeInbox implements IInboxRepository {
  seen = new Set<string>();
  async markProcessed(id: string) { if (this.seen.has(id)) return false; this.seen.add(id); return true; }
  snapshot() { const c = new Set(this.seen); return () => { this.seen = c; }; }
}

export class FakeHistorico implements IStatusHistoricoRepository {
  entries: StatusHistoricoEntry[] = [];
  async add(e: StatusHistoricoEntry) { this.entries.push(e); }
  async listByOrdemServico(id: string) { return this.entries.filter((e) => e.ordemServicoId === id); }
  snapshot() { const c = [...this.entries]; return () => { this.entries = c; }; }
}

export class FakeEstoque implements IItemEstoqueRepository {
  items = new Map<string, { disp: number; res: number }>();
  async save() {}
  async update() {}
  async list() { return []; }
  async findByPecaId() { return null; }
  private get(pecaId: string) {
    const i = this.items.get(pecaId);
    if (!i) throw new ValidationError(`Sem estoque cadastrado para ${pecaId}`);
    return i;
  }
  private dto(pecaId: string): ItemEstoque {
    const i = this.get(pecaId);
    return ItemEstoque.create({ pecaId, quantidadeDisponivel: i.disp, nivelMinimo: 0, nivelMaximo: 1000 });
  }
  async reservar(pecaId: string, q: number) {
    const i = this.get(pecaId);
    if (i.disp < q) throw new ValidationError('Estoque insuficiente');
    i.disp -= q; i.res += q; return this.dto(pecaId);
  }
  async utilizar(pecaId: string, q: number) {
    const i = this.get(pecaId);
    if (i.res < q) throw new ValidationError('Quantidade a utilizar excede o reservado');
    i.res -= q; return this.dto(pecaId);
  }
  async liberarReserva(pecaId: string, q: number) {
    const i = this.get(pecaId);
    if (i.res < q) throw new ValidationError('Quantidade a liberar excede o reservado');
    i.res -= q; i.disp += q; return this.dto(pecaId);
  }
  snapshot() {
    const c = new Map([...this.items].map(([k, v]) => [k, { ...v }]));
    return () => { this.items = c; };
  }
}

export const DEFAULT_CONFIG: SagaConfig = {
  timeoutAprovacaoMs: 60_000,
  timeoutPagamentoMs: 120_000,
  timeoutCompensacaoMs: 30_000,
  maxTentativasCompensacao: 3,
  validadeOrcamentoMs: 7 * 86_400_000,
};

export const OS_ID = 'os-1';

export const makeHarness = (config: Partial<SagaConfig> = {}) => {
  const ordens = new FakeOrdens();
  const sagas = new FakeSagas();
  const outbox = new FakeOutbox();
  const inbox = new FakeInbox();
  const historico = new FakeHistorico();
  const estoqueRepo = new FakeEstoque();
  estoqueRepo.items.set('peca-1', { disp: 5, res: 0 });
  const uow = new FakeUow([ordens, sagas, outbox, inbox, historico, estoqueRepo]);
  const now = { value: new Date('2026-11-11T12:00:00Z') };
  const notificacoes: { status: StatusOS; anterior: StatusOS }[] = [];

  const orchestrator = new SagaOrchestrator({
    uow,
    sagas,
    ordens,
    outbox,
    inbox,
    historico,
    clientes: {
      findById: async () =>
        ({ id: 'cli-1', nome: 'Maria', email: 'm@x.com', cpfCnpj: { value: '12345678909' } }) as never,
    } as never,
    catalogo: {
      findById: async (id: string) =>
        id === 'cat-1' ? ({ id, descricao: 'Troca de amortecedor', preco: 250, tempoEstimado: 1.5 } as never) : null,
    } as never,
    pecas: {
      findById: async (id: string) =>
        id === 'peca-1' ? ({ id, descricao: 'Amortecedor', precoVenda: 180 } as never) : null,
    } as never,
    estoque: new InventoryService(estoqueRepo),
    config: { ...DEFAULT_CONFIG, ...config },
    clock: () => now.value,
    onStatusChange: (os, anterior) => notificacoes.push({ status: os.status, anterior }),
  });

  const abrirOS = async (): Promise<OrdemServico> => {
    const os = OrdemServico.create({
      id: OS_ID, numeroOS: 'OS-20261111-0001', clienteId: 'cli-1', veiculoId: 'v-1',
      placa: 'ABC1D23', cpfCnpj: '12345678909', quilometragemEntrada: 1000,
    });
    await uow.run(async () => {
      await ordens.save(os);
      await orchestrator.iniciar(os, 'corr-1');
    });
    return os;
  };

  /** Entrega uma resposta de participante ao orquestrador. */
  const responder = async (
    type: MessageType,
    payload: Record<string, unknown> = {},
    messageId?: string,
  ): Promise<Envelope> => {
    const env = createEnvelope({
      type, messageId, sagaId: 'x', correlationId: 'corr-1',
      payload: { ordemServicoId: OS_ID, ...payload },
    });
    await orchestrator.handleReply(env);
    return env;
  };

  const saga = async () => (await sagas.findByOrdemServicoId(OS_ID)) as SagaInstancia;
  const os = async () => (await ordens.findById(OS_ID)) as OrdemServico;
  const avancarRelogio = (ms: number) => { now.value = new Date(now.value.getTime() + ms); };

  /** Conduz o caminho feliz até `ate` (inclusive). */
  const ATE = ['diagnostico', 'orcamento', 'aprovacao', 'pagamento', 'reparo'] as const;
  const conduzir = async (ate: (typeof ATE)[number]) => {
    await abrirOS();
    await responder('DiagnosticoIniciado', { execucaoId: 'ex-1' });
    await responder('DiagnosticoConcluido', {
      execucaoId: 'ex-1',
      servicos: [{ catalogoServicoId: 'cat-1', pecas: [{ pecaId: 'peca-1', quantidade: 2 }] }],
    });
    if (ate === 'diagnostico') return;
    await responder('OrcamentoGerado', { orcamentoId: 'orc-1', valorTotal: 610, validadeAte: 'x' });
    if (ate === 'orcamento') return;
    await responder('OrcamentoAprovado', { orcamentoId: 'orc-1', aprovadoEm: 'x' });
    if (ate === 'aprovacao') return;
    await responder('PagamentoSolicitado', { orcamentoId: 'orc-1', pagamentoId: 'pg-1', initPoint: 'http://mp', expiraEm: 'x' });
    await responder('PagamentoConfirmado', { orcamentoId: 'orc-1', pagamentoId: 'pg-1', mpPaymentId: '1', valor: 610, confirmadoEm: 'x' });
    if (ate === 'pagamento') return;
    await responder('ReparoIniciado', { execucaoId: 'ex-1' });
  };

  return {
    ordens, sagas, outbox, inbox, historico, estoqueRepo, orchestrator, uow, notificacoes,
    abrirOS, responder, saga, os, avancarRelogio, conduzir,
  };
};
