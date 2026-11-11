import { Envelope } from './envelope';

/** Filas/tópicos lógicos; a URL/ARN real vem da configuração do adapter. */
export const Destinations = {
  ExecutionCommands: 'execution-commands',
  BillingCommands: 'billing-commands',
  SagaReplies: 'os-saga-replies',
  EventosTopic: 'oficina-eventos',
} as const;

// ---- Comandos (OS -> participantes) ----------------------------------------

export interface SolicitarDiagnosticoPayload {
  ordemServicoId: string;
  numeroOS: string;
  clienteId: string;
  veiculoId: string;
  placa?: string;
  descricaoProblema?: string;
  prioridade: 'NORMAL' | 'ALTA';
}
export interface IniciarReparoPayload {
  ordemServicoId: string;
  execucaoId: string;
}
export interface CancelarExecucaoPayload {
  ordemServicoId: string;
  execucaoId?: string;
  motivo: string;
}
export interface ItemOrcamentoPayload {
  tipo: 'SERVICO' | 'PECA';
  referenciaId: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}
export interface GerarOrcamentoPayload {
  ordemServicoId: string;
  numeroOS: string;
  cliente: { id: string; nome: string; email?: string; cpfCnpj: string };
  itens: ItemOrcamentoPayload[];
  valorTotal: number;
  validadeAte: string;
}
export interface CancelarOrcamentoPayload {
  ordemServicoId: string;
  orcamentoId?: string;
  motivo: string;
}
export interface SolicitarPagamentoPayload {
  ordemServicoId: string;
  orcamentoId: string;
}
export interface EstornarPagamentoPayload {
  ordemServicoId: string;
  pagamentoId: string;
  motivo: string;
}

// ---- Eventos (participantes -> OS) -----------------------------------------

export interface DiagnosticoIniciadoPayload {
  ordemServicoId: string;
  execucaoId: string;
}
export interface DiagnosticoConcluidoPayload {
  ordemServicoId: string;
  execucaoId: string;
  servicos: { catalogoServicoId: string; pecas: { pecaId: string; quantidade: number }[] }[];
  observacoes?: string;
}
export interface MotivoPayload {
  ordemServicoId: string;
  execucaoId?: string;
  motivo: string;
}
export interface ReparoIniciadoPayload {
  ordemServicoId: string;
  execucaoId: string;
}
export interface ReparoConcluidoPayload {
  ordemServicoId: string;
  execucaoId: string;
  observacoes?: string;
}
export interface ExecucaoCanceladaPayload {
  ordemServicoId: string;
  execucaoId?: string;
}
export interface OrcamentoGeradoPayload {
  ordemServicoId: string;
  orcamentoId: string;
  valorTotal: number;
  validadeAte: string;
}
export interface OrcamentoAprovadoPayload {
  ordemServicoId: string;
  orcamentoId: string;
  aprovadoEm: string;
}
export interface OrcamentoRecusadoPayload {
  ordemServicoId: string;
  orcamentoId: string;
  motivo?: string;
}
export interface OrcamentoCanceladoPayload {
  ordemServicoId: string;
  orcamentoId?: string;
}
export interface PagamentoSolicitadoPayload {
  ordemServicoId: string;
  orcamentoId: string;
  pagamentoId: string;
  initPoint: string;
  expiraEm: string;
}
export interface PagamentoConfirmadoPayload {
  ordemServicoId: string;
  orcamentoId: string;
  pagamentoId: string;
  mpPaymentId: string;
  valor: number;
  confirmadoEm: string;
}
export interface PagamentoRecusadoPayload {
  ordemServicoId: string;
  orcamentoId: string;
  pagamentoId?: string;
  motivo: string;
}
export interface PagamentoEstornadoPayload {
  ordemServicoId: string;
  pagamentoId: string;
  mpRefundId: string;
}
export interface EstornoFalhouPayload {
  ordemServicoId: string;
  pagamentoId: string;
  motivo: string;
}
export interface OrdemServicoStatusAlteradoPayload {
  ordemServicoId: string;
  numeroOS: string;
  statusAnterior: string;
  statusNovo: string;
  motivo?: string;
}

/** Mapa tipo -> payload; garante tipagem em `createEnvelope` e nos handlers. */
export interface MessageCatalog {
  SolicitarDiagnostico: SolicitarDiagnosticoPayload;
  IniciarReparo: IniciarReparoPayload;
  CancelarExecucao: CancelarExecucaoPayload;
  GerarOrcamento: GerarOrcamentoPayload;
  CancelarOrcamento: CancelarOrcamentoPayload;
  SolicitarPagamento: SolicitarPagamentoPayload;
  EstornarPagamento: EstornarPagamentoPayload;
  DiagnosticoIniciado: DiagnosticoIniciadoPayload;
  DiagnosticoConcluido: DiagnosticoConcluidoPayload;
  DiagnosticoFalhou: MotivoPayload;
  ReparoIniciado: ReparoIniciadoPayload;
  ReparoConcluido: ReparoConcluidoPayload;
  ReparoFalhou: MotivoPayload;
  ExecucaoCancelada: ExecucaoCanceladaPayload;
  OrcamentoGerado: OrcamentoGeradoPayload;
  OrcamentoFalhou: MotivoPayload;
  OrcamentoAprovado: OrcamentoAprovadoPayload;
  OrcamentoRecusado: OrcamentoRecusadoPayload;
  OrcamentoCancelado: OrcamentoCanceladoPayload;
  PagamentoSolicitado: PagamentoSolicitadoPayload;
  PagamentoConfirmado: PagamentoConfirmadoPayload;
  PagamentoRecusado: PagamentoRecusadoPayload;
  PagamentoEstornado: PagamentoEstornadoPayload;
  EstornoFalhou: EstornoFalhouPayload;
  OrdemServicoStatusAlterado: OrdemServicoStatusAlteradoPayload;
}

export type MessageType = keyof MessageCatalog;
export type TypedEnvelope<T extends MessageType> = Envelope<MessageCatalog[T], T>;

/** Eventos que o OS consome em `os-saga-replies` (espelha a filter policy do SNS). */
export const SAGA_REPLY_TYPES = [
  'DiagnosticoIniciado',
  'DiagnosticoConcluido',
  'DiagnosticoFalhou',
  'ReparoIniciado',
  'ReparoConcluido',
  'ReparoFalhou',
  'ExecucaoCancelada',
  'OrcamentoGerado',
  'OrcamentoFalhou',
  'OrcamentoAprovado',
  'OrcamentoRecusado',
  'OrcamentoCancelado',
  'PagamentoSolicitado',
  'PagamentoConfirmado',
  'PagamentoRecusado',
  'PagamentoEstornado',
  'EstornoFalhou',
] as const satisfies readonly MessageType[];
