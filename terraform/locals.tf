locals {
  name_prefix = "${var.project_name}-${terraform.workspace}"

  # Eventos de resposta da Saga que o OS consome em `os-saga-replies`. Espelha
  # SAGA_REPLY_TYPES (src/shared/messaging/messages.ts) e a seção 4 de
  # docs/architecture/contratos-mensagens.md. `OrdemServicoStatusAlterado`
  # (publicado pelo próprio OS) fica de fora de propósito.
  saga_reply_types = [
    "DiagnosticoIniciado",
    "DiagnosticoConcluido",
    "DiagnosticoFalhou",
    "ReparoIniciado",
    "ReparoConcluido",
    "ReparoFalhou",
    "ExecucaoCancelada",
    "OrcamentoGerado",
    "OrcamentoFalhou",
    "OrcamentoAprovado",
    "OrcamentoRecusado",
    "OrcamentoCancelado",
    "PagamentoSolicitado",
    "PagamentoConfirmado",
    "PagamentoRecusado",
    "PagamentoEstornado",
    "EstornoFalhou",
  ]
}
