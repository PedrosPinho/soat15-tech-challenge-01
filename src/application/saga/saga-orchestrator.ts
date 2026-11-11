import { randomUUID } from 'crypto';
import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import { Servico } from '@domain/entities/servico.entity';
import {
  Compensacao,
  PassoSaga,
  ReservaEstoque,
  SagaDados,
  SagaInstancia,
  SagaPassoLog,
} from '@domain/entities/saga.entity';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { ICatalogoServicoRepository } from '@domain/repositories/catalogo-servico.repository';
import { IInboxRepository } from '@domain/repositories/inbox.repository';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IOutboxRepository, NewOutboxEntry } from '@domain/repositories/outbox.repository';
import { IPecaRepository } from '@domain/repositories/peca.repository';
import { ISagaRepository } from '@domain/repositories/saga.repository';
import {
  IStatusHistoricoRepository,
  StatusHistoricoEntry,
} from '@domain/repositories/status-historico.repository';
import { InventoryService } from '@domain/services/inventory.service';
import { IUnitOfWork } from '@domain/services/unit-of-work';
import { DomainError, NotFoundError, ValidationError } from '@shared/errors/domain.error';
import { Envelope, createEnvelope } from '@shared/messaging/envelope';
import {
  Destinations,
  DiagnosticoConcluidoPayload,
  MessageCatalog,
  MessageType,
} from '@shared/messaging/messages';
import { logger } from '@shared/logger';
import { COMPENSACOES, PASSOS_A_PULAR_NA_FALHA } from './ciclo-os.saga';
import { SagaConfig } from './saga-config';

export interface SagaOrchestratorDeps {
  uow: IUnitOfWork;
  sagas: ISagaRepository;
  ordens: IOrdemServicoRepository;
  clientes: IClienteRepository;
  catalogo: ICatalogoServicoRepository;
  pecas: IPecaRepository;
  estoque: InventoryService;
  outbox: IOutboxRepository;
  inbox: IInboxRepository;
  historico: IStatusHistoricoRepository;
  config: SagaConfig;
  clock?: () => Date;
  /** Chamado **após o commit** para cada mudança de status (notificação ao cliente). */
  onStatusChange?: (os: OrdemServico, statusAnterior: StatusOS) => void;
}

interface Ctx {
  saga: SagaInstancia;
  os: OrdemServico;
  osMudou: boolean;
  out: NewOutboxEntry[];
  logs: SagaPassoLog[];
  mudancas: { anterior: StatusOS }[];
  historicos: StatusHistoricoEntry[];
  mensagemId?: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Orquestrador da Saga "Ciclo da OS". Cada entrada pública roda numa única
 * transação (estado da OS + saga + log + outbox + inbox), de modo que o estado
 * e as mensagens a publicar nunca divergem. Respostas duplicadas/fora de ordem
 * viram no-op registrado em `saga_passos_log`.
 */
export class SagaOrchestrator {
  private readonly clock: () => Date;

  constructor(private readonly d: SagaOrchestratorDeps) {
    this.clock = d.clock ?? ((): Date => new Date());
  }

  // ---- Entradas públicas -------------------------------------------------

  /** Inicia a saga para uma OS recém-criada. Deve rodar na transação de criação. */
  async iniciar(
    os: OrdemServico,
    correlationId: string,
    descricaoProblema?: string,
  ): Promise<void> {
    const now = this.clock();
    const saga: SagaInstancia = {
      id: randomUUID(),
      ordemServicoId: os.id,
      passoAtual: 'DIAGNOSTICO',
      status: 'EM_ANDAMENTO',
      dados: {
        reservas: [],
        passosIniciados: ['DIAGNOSTICO'],
        compensacoesPendentes: [],
        tentativasCompensacao: 0,
        correlationId,
      },
      versao: 1,
      criadoEm: now,
      atualizadoEm: now,
    };
    await this.d.sagas.create(saga);
    await this.d.historico.add({
      ordemServicoId: os.id,
      statusNovo: os.status,
      ocorridoEm: now,
    });
    const ctx: Ctx = { saga, os, osMudou: false, out: [], logs: [], mudancas: [], historicos: [] };
    this.log(ctx, 'DIAGNOSTICO', 'SolicitarDiagnostico', 'OK');
    this.send(ctx, Destinations.ExecutionCommands, 'SolicitarDiagnostico', {
      ordemServicoId: os.id,
      numeroOS: os.numeroOS,
      clienteId: os.clienteId,
      veiculoId: os.veiculoId,
      placa: os.placa,
      descricaoProblema: descricaoProblema ?? os.observacoes,
      prioridade: 'NORMAL',
    });
    await this.flushSemSaga(ctx);
  }

  /** Processa uma resposta recebida em `os-saga-replies` (idempotente via inbox). */
  async handleReply(envelope: Envelope): Promise<void> {
    const mudancas = await this.d.uow.run(async () => {
      const novo = await this.d.inbox.markProcessed(envelope.messageId, envelope.type);
      if (!novo) {
        logger.info(
          { messageId: envelope.messageId, type: envelope.type },
          'Mensagem duplicada ignorada (inbox)',
        );
        return [];
      }
      const osId = (envelope.payload as { ordemServicoId?: string }).ordemServicoId;
      if (!osId) throw new ValidationError(`Mensagem ${envelope.type} sem ordemServicoId`);

      const ctx = await this.carregar(osId, envelope.messageId);
      if (!ctx) {
        logger.warn({ osId, type: envelope.type }, 'Saga não encontrada para a resposta recebida');
        return [];
      }
      await this.despachar(ctx, envelope);
      return this.persistir(ctx);
    });
    this.notificar(mudancas);
  }

  /** Cancelamento manual: dispara a compensação (não só troca o status). */
  async cancelar(ordemServicoId: string, motivo: string): Promise<OrdemServico> {
    const { os, mudancas } = await this.d.uow.run(async () => {
      const ctx = await this.carregar(ordemServicoId);
      if (!ctx) {
        // OS anterior à Saga (sem instância): cancela direto.
        const os = await this.d.ordens.findById(ordemServicoId);
        if (!os) throw new NotFoundError(`Ordem de serviço ${ordemServicoId} não encontrada`);
        const cancelada = os.cancelar(motivo);
        await this.d.ordens.update(cancelada);
        await this.d.historico.add({
          ordemServicoId,
          statusAnterior: os.status,
          statusNovo: cancelada.status,
          motivo,
          ocorridoEm: this.clock(),
        });
        return { os: cancelada, mudancas: [] };
      }
      if (!motivo.trim()) throw new ValidationError('Motivo de cancelamento é obrigatório');
      if (ctx.os.status === 'CANCELADA' || ctx.saga.status === 'COMPENSANDO') {
        throw new ValidationError('OS já está sendo cancelada ou foi cancelada');
      }
      if (
        ctx.saga.status !== 'EM_ANDAMENTO' ||
        ['FINALIZADA', 'ENTREGUE'].includes(ctx.os.status)
      ) {
        throw new ValidationError('OS finalizada ou entregue não pode ser cancelada');
      }
      this.log(ctx, ctx.saga.passoAtual, 'CancelamentoManual', 'OK', motivo);
      await this.falhar(ctx, motivo, []);
      const mudancas = await this.persistir(ctx);
      return { os: ctx.os, mudancas };
    });
    this.notificar(mudancas);
    return os;
  }

  /** Varre sagas com `expira_em` vencido: timeout de espera ou compensação travada. */
  async processarExpiradas(limit = 20): Promise<number> {
    const expiradas = await this.d.sagas.findExpired(this.clock(), limit);
    let tratadas = 0;
    for (const candidata of expiradas) {
      try {
        const mudancas = await this.d.uow.run(async () => {
          const ctx = await this.carregar(candidata.ordemServicoId);
          if (!ctx || !ctx.saga.expiraEm || ctx.saga.expiraEm > this.clock()) return [];
          await this.aoExpirar(ctx);
          return this.persistir(ctx);
        });
        this.notificar(mudancas);
        tratadas++;
      } catch (error) {
        logger.error({ error, sagaId: candidata.id }, 'Falha ao tratar saga expirada');
      }
    }
    return tratadas;
  }

  // ---- Despacho de eventos ----------------------------------------------

  private async despachar(ctx: Ctx, env: Envelope): Promise<void> {
    const type = env.type as MessageType;
    const p = env.payload as Record<string, unknown>;
    const { saga } = ctx;

    if (saga.status === 'COMPENSANDO' || saga.status === 'COMPENSADA') {
      return this.despacharCompensacao(ctx, type, p);
    }
    if (saga.status !== 'EM_ANDAMENTO') {
      return this.ignorar(ctx, type, `saga ${saga.status}`);
    }

    switch (type) {
      case 'DiagnosticoIniciado':
        if (ctx.os.status === 'RECEBIDA') this.mudarOs(ctx, ctx.os.iniciarDiagnostico());
        saga.dados.execucaoId = (p.execucaoId as string) ?? saga.dados.execucaoId;
        return this.log(ctx, 'DIAGNOSTICO', type, 'OK');
      case 'DiagnosticoConcluido':
        if (!this.esperando(ctx, type, 'DIAGNOSTICO')) return;
        return this.aoConcluirDiagnostico(ctx, p as unknown as DiagnosticoConcluidoPayload);
      case 'DiagnosticoFalhou':
      case 'OrcamentoFalhou':
      case 'OrcamentoRecusado':
      case 'PagamentoRecusado':
      case 'ReparoFalhou':
        return this.aoFalharParticipante(ctx, type, (p.motivo as string) ?? type);
      case 'OrcamentoGerado':
        if (!this.esperando(ctx, type, 'ORCAMENTO')) return;
        saga.dados.orcamentoId = p.orcamentoId as string;
        this.mudarOs(ctx, ctx.os.aguardarAprovacao());
        return this.avancar(ctx, 'APROVACAO', type, this.d.config.timeoutAprovacaoMs);
      case 'OrcamentoAprovado':
        if (!this.esperando(ctx, type, 'APROVACAO')) return;
        saga.dados.orcamentoId = (p.orcamentoId as string) ?? saga.dados.orcamentoId;
        this.send(ctx, Destinations.BillingCommands, 'SolicitarPagamento', {
          ordemServicoId: ctx.os.id,
          orcamentoId: saga.dados.orcamentoId as string,
        });
        return this.avancar(ctx, 'PAGAMENTO', type, this.d.config.timeoutPagamentoMs);
      case 'PagamentoSolicitado':
        if (!this.esperando(ctx, type, 'PAGAMENTO')) return;
        saga.dados.pagamentoId = p.pagamentoId as string;
        saga.dados.initPoint = p.initPoint as string;
        if (ctx.os.status === 'AGUARDANDO_APROVACAO') this.mudarOs(ctx, ctx.os.aguardarPagamento());
        saga.expiraEm = this.depois(this.d.config.timeoutPagamentoMs);
        return this.log(ctx, 'PAGAMENTO', type, 'OK');
      case 'PagamentoConfirmado':
        if (!this.esperando(ctx, type, 'PAGAMENTO')) return;
        saga.dados.pagamentoId = (p.pagamentoId as string) ?? saga.dados.pagamentoId;
        if (ctx.os.status === 'AGUARDANDO_APROVACAO') this.mudarOs(ctx, ctx.os.aguardarPagamento());
        this.mudarOs(ctx, ctx.os.confirmarPagamento());
        this.send(ctx, Destinations.ExecutionCommands, 'IniciarReparo', {
          ordemServicoId: ctx.os.id,
          execucaoId: saga.dados.execucaoId as string,
        });
        return this.avancar(ctx, 'REPARO', type, undefined);
      case 'ReparoIniciado':
        return this.log(ctx, 'REPARO', type, 'OK');
      case 'ReparoConcluido':
        if (!this.esperando(ctx, type, 'REPARO')) return;
        return this.aoConcluirReparo(ctx);
      default:
        return this.ignorar(ctx, type, 'evento sem ação no estado atual');
    }
  }

  private async despacharCompensacao(
    ctx: Ctx,
    type: MessageType,
    p: Record<string, unknown>,
  ): Promise<void> {
    const { saga } = ctx;
    const emCurso = saga.dados.compensacaoEmCurso;

    // Pagamento confirmado depois de a saga já ter desistido (timeout x cliente pagando):
    // o dinheiro entrou, então é preciso estornar.
    if (type === 'PagamentoConfirmado') {
      saga.dados.pagamentoId = (p.pagamentoId as string) ?? saga.dados.pagamentoId;
      this.log(ctx, 'PAGAMENTO', type, 'OK', 'pagamento tardio: estorno agendado');
      if (
        !saga.dados.compensacoesPendentes.includes('ESTORNAR_PAGAMENTO') &&
        emCurso !== 'ESTORNAR_PAGAMENTO'
      ) {
        saga.dados.compensacoesPendentes.push('ESTORNAR_PAGAMENTO');
      }
      if (saga.status === 'COMPENSADA') saga.status = 'COMPENSANDO';
      if (!emCurso) await this.avancarCompensacao(ctx);
      return;
    }

    if (emCurso) {
      const def = COMPENSACOES[emCurso];
      if (type === def.confirmacao) {
        this.log(ctx, 'COMPENSACAO', type, 'OK', emCurso);
        saga.dados.compensacaoEmCurso = undefined;
        saga.dados.tentativasCompensacao = 0;
        return this.avancarCompensacao(ctx);
      }
      if (def.falha && type === def.falha) {
        this.log(ctx, 'COMPENSACAO', type, 'FALHA', (p.motivo as string) ?? emCurso);
        return this.retentarCompensacao(ctx, (p.motivo as string) ?? type);
      }
    }
    return this.ignorar(ctx, type, 'saga em compensação');
  }

  // ---- Passos locais e remotos ------------------------------------------

  private async aoConcluirDiagnostico(
    ctx: Ctx,
    payload: DiagnosticoConcluidoPayload,
  ): Promise<void> {
    const { saga } = ctx;
    saga.dados.execucaoId = payload.execucaoId ?? saga.dados.execucaoId;
    if (ctx.os.status === 'RECEBIDA') this.mudarOs(ctx, ctx.os.iniciarDiagnostico());

    // Passo local: precificar + reservar estoque (se falhar, desfaz o que reservou).
    saga.dados.passosIniciados.push('RESERVA_ESTOQUE');
    saga.passoAtual = 'RESERVA_ESTOQUE';
    let servicos: Servico[];
    try {
      servicos = await this.precificar(payload);
      saga.dados.reservas = await this.reservar(servicos);
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      this.log(ctx, 'RESERVA_ESTOQUE', 'Reservar', 'FALHA', error.message);
      return this.falhar(ctx, error.message, ['RESERVA_ESTOQUE']);
    }
    this.log(ctx, 'RESERVA_ESTOQUE', 'Reservar', 'OK');

    this.mudarOs(ctx, ctx.os.registrarDiagnostico(servicos));
    const cliente = await this.d.clientes.findById(ctx.os.clienteId);
    if (!cliente) return this.falhar(ctx, 'Cliente da OS não encontrado', ['RESERVA_ESTOQUE']);

    const itens = ctx.os.servicos.flatMap((s) => [
      {
        tipo: 'SERVICO' as const,
        referenciaId: s.id,
        descricao: s.descricao,
        quantidade: 1,
        valorUnitario: round2(s.valorMaoDeObra),
      },
      ...s.pecasUtilizadas.map((pc) => ({
        tipo: 'PECA' as const,
        referenciaId: pc.pecaId,
        descricao: pc.descricao ?? pc.pecaId,
        quantidade: pc.quantidade,
        valorUnitario: round2(pc.precoUnitario),
      })),
    ]);
    this.send(ctx, Destinations.BillingCommands, 'GerarOrcamento', {
      ordemServicoId: ctx.os.id,
      numeroOS: ctx.os.numeroOS,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        cpfCnpj: cliente.cpfCnpj.value,
      },
      itens,
      valorTotal: round2(ctx.os.valorTotal),
      validadeAte: this.depois(this.d.config.validadeOrcamentoMs).toISOString(),
    });
    this.avancar(ctx, 'ORCAMENTO', 'DiagnosticoConcluido', this.d.config.timeoutCompensacaoMs);
  }

  private async aoConcluirReparo(ctx: Ctx): Promise<void> {
    const { saga } = ctx;
    saga.dados.passosIniciados.push('FINALIZACAO');
    for (const r of saga.dados.reservas)
      await this.d.estoque.utilizarEstoque(r.pecaId, r.quantidade);
    saga.dados.reservas = [];
    this.mudarOs(ctx, ctx.os.concluir());
    saga.passoAtual = 'FINALIZACAO';
    saga.status = 'CONCLUIDA';
    saga.expiraEm = undefined;
    this.log(ctx, 'FINALIZACAO', 'ReparoConcluido', 'OK');
  }

  private async precificar(payload: DiagnosticoConcluidoPayload): Promise<Servico[]> {
    const servicos: Servico[] = [];
    for (const item of payload.servicos ?? []) {
      const cat = await this.d.catalogo.findById(item.catalogoServicoId);
      if (!cat)
        throw new NotFoundError(`Serviço do catálogo ${item.catalogoServicoId} não encontrado`);
      const pecasUtilizadas = [];
      for (const pc of item.pecas ?? []) {
        const peca = await this.d.pecas.findById(pc.pecaId);
        if (!peca) throw new NotFoundError(`Peça ${pc.pecaId} não encontrada`);
        pecasUtilizadas.push({
          pecaId: peca.id,
          descricao: peca.descricao,
          quantidade: pc.quantidade,
          precoUnitario: peca.precoVenda,
        });
      }
      servicos.push(
        Servico.create({
          descricao: cat.descricao,
          tempoEstimadoMinutos: Math.round(cat.tempoEstimado * 60),
          valorMaoDeObra: cat.preco,
          pecasUtilizadas,
        }),
      );
    }
    return servicos;
  }

  /** Reserva atômica por peça; em falha parcial devolve o que já reservou. */
  private async reservar(servicos: Servico[]): Promise<ReservaEstoque[]> {
    const totais = new Map<string, number>();
    for (const s of servicos) {
      for (const pc of s.pecasUtilizadas) {
        totais.set(pc.pecaId, (totais.get(pc.pecaId) ?? 0) + pc.quantidade);
      }
    }
    const feitas: { pecaId: string; quantidade: number }[] = [];
    try {
      for (const [pecaId, quantidade] of totais) {
        await this.d.estoque.reservarEstoque(pecaId, quantidade);
        feitas.push({ pecaId, quantidade });
      }
    } catch (error) {
      for (const r of feitas) await this.d.estoque.liberarReserva(r.pecaId, r.quantidade);
      throw error;
    }
    return feitas;
  }

  // ---- Falha e compensação ------------------------------------------------

  private async aoFalharParticipante(ctx: Ctx, type: MessageType, motivo: string): Promise<void> {
    this.log(ctx, ctx.saga.passoAtual, type, 'FALHA', motivo);
    return this.falhar(ctx, motivo, PASSOS_A_PULAR_NA_FALHA[type] ?? []);
  }

  /** Entra em COMPENSANDO e agenda as compensações em **ordem inversa**. */
  private async falhar(ctx: Ctx, motivo: string, pular: PassoSaga[]): Promise<void> {
    const { saga } = ctx;
    const compensacoes: Compensacao[] = [];
    for (const passo of [...saga.dados.passosIniciados].reverse()) {
      if (pular.includes(passo)) continue;
      const c = this.compensacaoDoPasso(passo);
      if (!c || compensacoes.includes(c)) continue;
      if (c === 'ESTORNAR_PAGAMENTO' && !saga.dados.pagamentoId) continue;
      if (c === 'LIBERAR_RESERVA' && saga.dados.reservas.length === 0) continue;
      compensacoes.push(c);
    }
    saga.status = 'COMPENSANDO';
    saga.dados.motivo = motivo;
    saga.dados.compensacoesPendentes = compensacoes;
    saga.dados.compensacaoEmCurso = undefined;
    saga.dados.tentativasCompensacao = 0;
    this.log(
      ctx,
      saga.passoAtual,
      'IniciarCompensacao',
      'OK',
      compensacoes.join(' > ') || 'nenhuma',
    );
    await this.avancarCompensacao(ctx);
  }

  private async avancarCompensacao(ctx: Ctx): Promise<void> {
    const { saga } = ctx;
    while (saga.dados.compensacoesPendentes.length > 0) {
      const proxima = saga.dados.compensacoesPendentes.shift() as Compensacao;
      if (proxima === 'LIBERAR_RESERVA') {
        for (const r of saga.dados.reservas)
          await this.d.estoque.liberarReserva(r.pecaId, r.quantidade);
        saga.dados.reservas = [];
        this.log(ctx, 'COMPENSACAO', 'LiberarReserva', 'OK');
        continue;
      }
      saga.dados.compensacaoEmCurso = proxima;
      saga.dados.tentativasCompensacao = 1;
      this.enviarCompensacao(ctx, proxima);
      saga.expiraEm = this.depois(this.d.config.timeoutCompensacaoMs);
      return;
    }
    this.finalizarCompensacao(ctx);
  }

  private finalizarCompensacao(ctx: Ctx): void {
    const { saga } = ctx;
    const motivo = saga.dados.motivo ?? 'Saga compensada';
    let os = ctx.os;
    if (os.temPagamento) os = os.estornarPagamento();
    if (os.status !== 'CANCELADA') os = os.cancelar(motivo);
    this.mudarOs(ctx, os, motivo);
    saga.status = 'COMPENSADA';
    saga.expiraEm = undefined;
    saga.dados.compensacaoEmCurso = undefined;
    this.log(ctx, 'COMPENSACAO', 'OSCancelada', 'OK', motivo);
  }

  private async retentarCompensacao(ctx: Ctx, motivo: string): Promise<void> {
    const { saga } = ctx;
    const emCurso = saga.dados.compensacaoEmCurso as Compensacao;
    if (saga.dados.tentativasCompensacao >= this.d.config.maxTentativasCompensacao) {
      saga.status = 'FALHA_COMPENSACAO';
      saga.expiraEm = undefined;
      this.log(ctx, 'COMPENSACAO', emCurso, 'FALHA', `esgotadas as tentativas: ${motivo}`);
      logger.error(
        { sagaId: saga.id, ordemServicoId: ctx.os.id, compensacao: emCurso, motivo },
        'Saga em FALHA_COMPENSACAO: intervenção manual necessária',
      );
      return;
    }
    saga.dados.tentativasCompensacao += 1;
    this.enviarCompensacao(ctx, emCurso);
    saga.expiraEm = this.depois(this.d.config.timeoutCompensacaoMs);
  }

  private async aoExpirar(ctx: Ctx): Promise<void> {
    const { saga } = ctx;
    if (saga.status === 'COMPENSANDO' && saga.dados.compensacaoEmCurso) {
      this.log(ctx, 'COMPENSACAO', 'Timeout', 'FALHA', saga.dados.compensacaoEmCurso);
      return this.retentarCompensacao(ctx, 'timeout aguardando confirmação da compensação');
    }
    if (saga.status === 'EM_ANDAMENTO') {
      const motivo = `Timeout aguardando ${saga.passoAtual === 'APROVACAO' ? 'aprovação do orçamento' : saga.passoAtual === 'PAGAMENTO' ? 'pagamento' : saga.passoAtual}`;
      this.log(ctx, saga.passoAtual, 'Timeout', 'FALHA', motivo);
      return this.falhar(ctx, motivo, []);
    }
    saga.expiraEm = undefined;
  }

  private enviarCompensacao(ctx: Ctx, c: Compensacao): void {
    const { saga, os } = ctx;
    const motivo = saga.dados.motivo ?? 'Saga compensada';
    const def = COMPENSACOES[c];
    this.log(
      ctx,
      'COMPENSACAO',
      def.comando as string,
      'OK',
      `tentativa ${saga.dados.tentativasCompensacao}`,
    );
    switch (c) {
      case 'ESTORNAR_PAGAMENTO':
        return this.send(ctx, def.fila as string, 'EstornarPagamento', {
          ordemServicoId: os.id,
          pagamentoId: saga.dados.pagamentoId as string,
          motivo,
        });
      case 'CANCELAR_ORCAMENTO':
        return this.send(ctx, def.fila as string, 'CancelarOrcamento', {
          ordemServicoId: os.id,
          orcamentoId: saga.dados.orcamentoId,
          motivo,
        });
      case 'CANCELAR_EXECUCAO':
        return this.send(ctx, def.fila as string, 'CancelarExecucao', {
          ordemServicoId: os.id,
          execucaoId: saga.dados.execucaoId,
          motivo,
        });
      default:
        return undefined;
    }
  }

  private compensacaoDoPasso(passo: PassoSaga): Compensacao | undefined {
    const map: Partial<Record<PassoSaga, Compensacao>> = {
      DIAGNOSTICO: 'CANCELAR_EXECUCAO',
      RESERVA_ESTOQUE: 'LIBERAR_RESERVA',
      ORCAMENTO: 'CANCELAR_ORCAMENTO',
      PAGAMENTO: 'ESTORNAR_PAGAMENTO',
    };
    return map[passo];
  }

  // ---- Utilidades -----------------------------------------------------------

  /** Garante que a resposta é do passo esperado; senão, registra e ignora. */
  private esperando(ctx: Ctx, type: MessageType, passo: PassoSaga): boolean {
    if (ctx.saga.passoAtual === passo) return true;
    this.ignorar(ctx, type, `esperava passo ${passo}, saga está em ${ctx.saga.passoAtual}`);
    return false;
  }

  private ignorar(ctx: Ctx, type: MessageType, motivo: string): void {
    this.log(ctx, ctx.saga.passoAtual, type, 'IGNORADO', motivo);
    logger.info({ sagaId: ctx.saga.id, type, motivo }, 'Resposta da saga ignorada');
  }

  private avancar(ctx: Ctx, passo: PassoSaga, origem: string, timeoutMs: number | undefined): void {
    ctx.saga.passoAtual = passo;
    if (!ctx.saga.dados.passosIniciados.includes(passo)) ctx.saga.dados.passosIniciados.push(passo);
    ctx.saga.expiraEm = timeoutMs ? this.depois(timeoutMs) : undefined;
    this.log(ctx, passo, origem, 'OK');
  }

  private mudarOs(ctx: Ctx, novo: OrdemServico, motivo?: string): void {
    if (novo.status !== ctx.os.status) {
      ctx.mudancas.push({ anterior: ctx.os.status });
      const anterior = ctx.os.status;
      this.send(ctx, Destinations.EventosTopic, 'OrdemServicoStatusAlterado', {
        ordemServicoId: novo.id,
        numeroOS: novo.numeroOS,
        statusAnterior: anterior,
        statusNovo: novo.status,
        motivo,
      });
      ctx.historicos.push({
        ordemServicoId: novo.id,
        statusAnterior: anterior,
        statusNovo: novo.status,
        motivo,
        ocorridoEm: this.clock(),
      });
    }
    ctx.os = novo;
    ctx.osMudou = true;
  }

  private send<T extends MessageType>(
    ctx: Ctx,
    destination: string,
    type: T,
    payload: MessageCatalog[T],
  ): void {
    const kind = destination === Destinations.EventosTopic ? 'topic' : 'queue';
    ctx.out.push({
      kind,
      destination,
      envelope: createEnvelope({
        type,
        sagaId: ctx.saga.id,
        correlationId: ctx.saga.dados.correlationId,
        payload,
      }) as Envelope,
    });
  }

  private log(
    ctx: Ctx,
    passo: string,
    acao: string,
    resultado: SagaPassoLog['resultado'],
    detalhe?: string,
  ): void {
    ctx.logs.push({
      sagaId: ctx.saga.id,
      passo,
      acao,
      resultado,
      mensagemId: ctx.mensagemId,
      detalhe,
      ocorridoEm: this.clock(),
    });
  }

  private depois(ms: number): Date {
    return new Date(this.clock().getTime() + ms);
  }

  private async carregar(osId: string, mensagemId?: string): Promise<Ctx | null> {
    const saga = await this.d.sagas.findByOrdemServicoId(osId);
    if (!saga) return null;
    const os = await this.d.ordens.findById(osId);
    if (!os) throw new NotFoundError(`Ordem de serviço ${osId} não encontrada`);
    return {
      saga: { ...saga, dados: structuredClone(saga.dados) as SagaDados },
      os,
      osMudou: false,
      out: [],
      logs: [],
      mudancas: [],
      historicos: [],
      mensagemId,
    };
  }

  /** Grava OS, saga (lock otimista), log e outbox; devolve as mudanças para notificar pós-commit. */
  private async persistir(ctx: Ctx): Promise<{ os: OrdemServico; anterior: StatusOS }[]> {
    if (ctx.osMudou) await this.d.ordens.update(ctx.os);
    ctx.saga.atualizadoEm = this.clock();
    ctx.saga = await this.d.sagas.update(ctx.saga);
    await this.gravarLogEOutbox(ctx);
    return ctx.mudancas.map((m) => ({ os: ctx.os, anterior: m.anterior }));
  }

  /** Variante usada em `iniciar` (a saga acabou de ser criada na mesma transação). */
  private async flushSemSaga(ctx: Ctx): Promise<void> {
    await this.gravarLogEOutbox(ctx);
  }

  private async gravarLogEOutbox(ctx: Ctx): Promise<void> {
    for (const h of ctx.historicos) await this.d.historico.add(h);
    for (const entry of ctx.logs) await this.d.sagas.appendLog(entry);
    for (const msg of ctx.out) await this.d.outbox.enqueue(msg);
  }

  private notificar(mudancas: { os: OrdemServico; anterior: StatusOS }[]): void {
    for (const m of mudancas) {
      try {
        this.d.onStatusChange?.(m.os, m.anterior);
      } catch (error) {
        logger.error({ error }, 'Falha ao notificar mudança de status');
      }
    }
  }
}
