import { Compensacao, PassoSaga } from '@domain/entities/saga.entity';
import { Destinations, MessageType } from '@shared/messaging/messages';

/**
 * Definição declarativa da Saga "Ciclo da OS" (ver `PHASE_4_PLAN.md` e
 * `contratos-mensagens.md`). O orquestrador lê esta tabela: o fluxo e as
 * compensações ficam num só lugar, legíveis e testáveis.
 */
export interface DefinicaoPasso {
  /** Executor: serviço remoto (comando) ou o próprio OS. */
  executor: 'EXECUTION' | 'BILLING' | 'OS';
  comando?: MessageType;
  /** Evento que conclui o passo com sucesso. */
  sucesso?: MessageType;
  /** Eventos que falham o passo. */
  falhas: MessageType[];
  /** Compensação a executar se um passo posterior falhar. */
  compensacao?: Compensacao;
}

export const CICLO_OS: Record<PassoSaga, DefinicaoPasso> = {
  DIAGNOSTICO: {
    executor: 'EXECUTION',
    comando: 'SolicitarDiagnostico',
    sucesso: 'DiagnosticoConcluido',
    falhas: ['DiagnosticoFalhou'],
    compensacao: 'CANCELAR_EXECUCAO',
  },
  RESERVA_ESTOQUE: { executor: 'OS', falhas: [], compensacao: 'LIBERAR_RESERVA' },
  ORCAMENTO: {
    executor: 'BILLING',
    comando: 'GerarOrcamento',
    sucesso: 'OrcamentoGerado',
    falhas: ['OrcamentoFalhou'],
    compensacao: 'CANCELAR_ORCAMENTO',
  },
  APROVACAO: {
    executor: 'BILLING',
    sucesso: 'OrcamentoAprovado',
    falhas: ['OrcamentoRecusado'],
  },
  PAGAMENTO: {
    executor: 'BILLING',
    comando: 'SolicitarPagamento',
    sucesso: 'PagamentoConfirmado',
    falhas: ['PagamentoRecusado'],
    compensacao: 'ESTORNAR_PAGAMENTO',
  },
  REPARO: {
    executor: 'EXECUTION',
    comando: 'IniciarReparo',
    sucesso: 'ReparoConcluido',
    falhas: ['ReparoFalhou'],
  },
  FINALIZACAO: { executor: 'OS', falhas: [] },
};

export interface DefinicaoCompensacao {
  /** Comando enviado (ausente = compensação local). */
  comando?: MessageType;
  fila?: string;
  /** Evento de resposta que confirma a compensação. */
  confirmacao?: MessageType;
  /** Evento de resposta que indica falha (retentável). */
  falha?: MessageType;
}

export const COMPENSACOES: Record<Compensacao, DefinicaoCompensacao> = {
  ESTORNAR_PAGAMENTO: {
    comando: 'EstornarPagamento',
    fila: Destinations.BillingCommands,
    confirmacao: 'PagamentoEstornado',
    falha: 'EstornoFalhou',
  },
  CANCELAR_ORCAMENTO: {
    comando: 'CancelarOrcamento',
    fila: Destinations.BillingCommands,
    confirmacao: 'OrcamentoCancelado',
  },
  LIBERAR_RESERVA: {},
  CANCELAR_EXECUCAO: {
    comando: 'CancelarExecucao',
    fila: Destinations.ExecutionCommands,
    confirmacao: 'ExecucaoCancelada',
  },
};

/**
 * Passos cujo fracasso dispensa a própria compensação (o participante já
 * desfez seu lado ao responder a falha) — e, para a recusa do orçamento, a do
 * orçamento também (já está RECUSADO no Billing).
 */
export const PASSOS_A_PULAR_NA_FALHA: Partial<Record<MessageType, PassoSaga[]>> = {
  DiagnosticoFalhou: ['DIAGNOSTICO'],
  OrcamentoFalhou: ['ORCAMENTO'],
  OrcamentoRecusado: ['ORCAMENTO', 'APROVACAO'],
  PagamentoRecusado: ['PAGAMENTO'],
  ReparoFalhou: ['REPARO'],
};
