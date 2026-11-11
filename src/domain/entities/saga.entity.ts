export type SagaStatus =
  | 'EM_ANDAMENTO'
  | 'COMPENSANDO'
  | 'CONCLUIDA'
  | 'COMPENSADA'
  | 'FALHA_COMPENSACAO';

export type PassoSaga =
  | 'DIAGNOSTICO'
  | 'RESERVA_ESTOQUE'
  | 'ORCAMENTO'
  | 'APROVACAO'
  | 'PAGAMENTO'
  | 'REPARO'
  | 'FINALIZACAO';

/** Ações de compensação, executadas em ordem inversa. */
export type Compensacao =
  | 'ESTORNAR_PAGAMENTO'
  | 'CANCELAR_ORCAMENTO'
  | 'LIBERAR_RESERVA'
  | 'CANCELAR_EXECUCAO';

export interface ReservaEstoque {
  pecaId: string;
  quantidade: number;
}

/** Estado auxiliar da saga (coluna `dados jsonb`). */
export interface SagaDados {
  execucaoId?: string;
  orcamentoId?: string;
  pagamentoId?: string;
  initPoint?: string;
  reservas: ReservaEstoque[];
  /** Passos já iniciados, em ordem — base do cálculo das compensações. */
  passosIniciados: PassoSaga[];
  /** Compensações ainda por executar (fila; a próxima é a primeira). */
  compensacoesPendentes: Compensacao[];
  /** Compensação cujo comando foi enviado e aguarda resposta. */
  compensacaoEmCurso?: Compensacao;
  motivo?: string;
  /** Tentativas da compensação em curso. */
  tentativasCompensacao: number;
  correlationId: string;
}

export interface SagaInstancia {
  id: string;
  ordemServicoId: string;
  passoAtual: PassoSaga;
  status: SagaStatus;
  dados: SagaDados;
  versao: number;
  expiraEm?: Date;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface SagaPassoLog {
  sagaId: string;
  passo: string;
  acao: string;
  resultado: 'OK' | 'FALHA' | 'IGNORADO';
  mensagemId?: string;
  detalhe?: string;
  ocorridoEm: Date;
}
