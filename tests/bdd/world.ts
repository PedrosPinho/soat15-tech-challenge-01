import { InMemoryMessageBus } from '@infrastructure/messaging/in-memory-message-bus';
import { createEnvelope, Envelope } from '@shared/messaging/envelope';
import { Destinations, MessageType } from '@shared/messaging/messages';
import { makeHarness, OS_ID } from '../application/saga/saga-harness';

type Harness = ReturnType<typeof makeHarness>;

const COMANDOS_COMPENSACAO = ['EstornarPagamento', 'CancelarOrcamento', 'CancelarExecucao', 'LiberarReserva'];

/**
 * Mundo do BDD: o orquestrador REAL (com repositórios em memória e rollback transacional)
 * conversa por um `InMemoryMessageBus` com participantes simulados de Execution e Billing.
 * Os participantes respondem automaticamente ao que é "mecânico/sistema" e ficam parados nas
 * decisões humanas (concluir diagnóstico, aprovar, pagar...), que os passos disparam à mão.
 */
export class Mundo {
  readonly h: Harness;
  readonly bus = new InMemoryMessageBus();
  /** Comandos entregues aos participantes, em ordem. */
  readonly comandos: Envelope[] = [];
  private cursor = 0;
  private respostas: Envelope[] = [];

  /** Respostas reais dos participantes (contratos), quando informadas, no lugar dos modelos fixos. */
  private readonly fixtures = new Map<string, Envelope>();

  constructor(config: Parameters<typeof makeHarness>[0] = {}, fixtures: Envelope[] = []) {
    for (const f of fixtures) this.fixtures.set(f.type, f);
    this.h = makeHarness(config);
    void this.bus.subscribe(Destinations.ExecutionCommands, async (c) => this.execution(c));
    void this.bus.subscribe(Destinations.BillingCommands, async (c) => this.billing(c));
  }

  // ---- participantes simulados --------------------------------------------------------

  private responde(type: MessageType, payload: Record<string, unknown>, sagaId = 'saga'): void {
    const real = this.fixtures.get(type);
    this.respostas.push(
      createEnvelope({
        type, sagaId, correlationId: 'corr-1',
        payload: real ? this.doFixture(real) : { ordemServicoId: OS_ID, ...payload },
      }),
    );
  }

  /**
   * Payload do evento real, com os ids de correlação (orçamento, pagamento, execução) trocados
   * pelos que ESTA saga conhece: os fixtures vêm de fluxos diferentes dos produtores, mas
   * na vida real cada id é o que o próprio participante devolveu ao OS.
   */
  private doFixture(real: Envelope): Record<string, unknown> {
    const dados = this.sagaAtual?.dados as Record<string, unknown> | undefined;
    const payload: Record<string, unknown> = { ...(real.payload as object), ordemServicoId: OS_ID };
    for (const chave of ['orcamentoId', 'pagamentoId', 'execucaoId']) {
      if (chave in payload && dados?.[chave] !== undefined) payload[chave] = dados[chave];
    }
    return payload;
  }

  private sagaAtual?: { dados: unknown };

  /** Entrega ao orquestrador o evento real (do contrato) do tipo pedido. */
  async eventoReal(type: MessageType): Promise<void> {
    const real = this.fixtures.get(type);
    if (!real) throw new Error(`Sem fixture de contrato para ${type}`);
    this.sagaAtual = await this.h.sagas.findByOrdemServicoId(OS_ID) ?? undefined;
    await this.evento(type, this.doFixture(real));
  }

  private execution(c: Envelope): void {
    this.comandos.push(c);
    if (c.type === 'SolicitarDiagnostico') this.responde('DiagnosticoIniciado', { execucaoId: 'ex-1' });
    if (c.type === 'IniciarReparo') this.responde('ReparoIniciado', { execucaoId: 'ex-1' });
    if (c.type === 'CancelarExecucao') this.responde('ExecucaoCancelada', { execucaoId: 'ex-1' });
  }

  private billing(c: Envelope): void {
    this.comandos.push(c);
    if (c.type === 'GerarOrcamento') {
      const p = c.payload as { valorTotal: number };
      this.responde('OrcamentoGerado', { orcamentoId: 'orc-1', valorTotal: p.valorTotal, validadeAte: 'x' });
    }
    if (c.type === 'SolicitarPagamento') {
      this.responde('PagamentoSolicitado', {
        orcamentoId: 'orc-1', pagamentoId: 'pg-1', initPoint: 'http://mp/checkout', expiraEm: 'x',
      });
    }
    if (c.type === 'CancelarOrcamento') this.responde('OrcamentoCancelado', { orcamentoId: 'orc-1' });
    if (c.type === 'EstornarPagamento') this.responde('PagamentoEstornado', { pagamentoId: 'pg-1', mpRefundId: 'rf-1' });
  }

  // ---- "relay" + entrega das respostas -----------------------------------------------

  /** Roda até estabilizar: outbox -> bus -> participantes -> respostas -> orquestrador. */
  async estabilizar(): Promise<void> {
    for (let i = 0; i < 100; i++) {
      const novas = this.h.outbox.entries.slice(this.cursor);
      this.cursor = this.h.outbox.entries.length;
      for (const e of novas) {
        if (e.kind === 'queue') await this.bus.send(e.destination, e.envelope);
        else await this.bus.publish(e.destination, e.envelope);
      }
      this.sagaAtual = (await this.h.sagas.findByOrdemServicoId(OS_ID)) ?? undefined;
      const resp = this.respostas.shift();
      if (resp) await this.h.orchestrator.handleReply(resp);
      else if (this.cursor === this.h.outbox.entries.length) return;
    }
    throw new Error('Saga não estabilizou em 100 iterações (laço de mensagens?)');
  }

  /** Ação humana/externa: entrega um evento ao orquestrador e deixa tudo assentar. */
  async evento(type: MessageType, payload: Record<string, unknown>, messageId?: string): Promise<void> {
    await this.h.orchestrator.handleReply(
      createEnvelope({
        type, messageId, sagaId: 'saga', correlationId: 'corr-1',
        payload: { ordemServicoId: OS_ID, ...payload },
      }),
    );
    await this.estabilizar();
  }

  async abrirOS(): Promise<void> {
    await this.h.abrirOS();
    await this.estabilizar();
  }

  async concluirDiagnostico(pecas: number, messageId?: string): Promise<void> {
    await this.evento('DiagnosticoConcluido', {
      execucaoId: 'ex-1',
      servicos: [{ catalogoServicoId: 'cat-1', pecas: [{ pecaId: 'peca-1', quantidade: pecas }] }],
    }, messageId);
  }

  // ---- consultas ---------------------------------------------------------------------

  tiposDosComandos(): string[] {
    return this.comandos.map((c) => c.type);
  }

  compensacoes(): string[] {
    return this.tiposDosComandos().filter((t) => COMANDOS_COMPENSACAO.includes(t));
  }

  vezes(tipo: string): number {
    return this.comandos.filter((c) => c.type === tipo).length;
  }
}
