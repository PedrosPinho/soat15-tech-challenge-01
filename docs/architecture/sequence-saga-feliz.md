# Sequência — Saga do ciclo da OS, caminho feliz

Orquestrador no OS Service (`src/application/saga/`); estado em `saga_instancias`/`saga_passos_log`.
Setas tracejadas (`-)`/`--)`) são mensagens assíncronas (SQS/SNS) com outbox + inbox; as sólidas, chamadas síncronas
ou trabalho local. Contratos: [`contratos-mensagens.md`](contratos-mensagens.md).

```mermaid
sequenceDiagram
  autonumber
  participant A as Atendente
  participant OS as OS Service (orquestrador)
  participant EX as Execution
  participant BI as Billing
  participant MP as Mercado Pago
  participant C as Cliente
  A->>OS: POST /api/ordens-servico
  OS->>OS: OS RECEBIDA + saga EM_ANDAMENTO + outbox (mesma transação)
  OS-)EX: SolicitarDiagnostico
  EX--)OS: DiagnosticoIniciado → OS EM_DIAGNOSTICO
  Note over EX: mecânico conclui o diagnóstico<br/>PATCH /api/execucoes/:id/diagnostico/concluir
  EX--)OS: DiagnosticoConcluido{serviços, peças}
  OS->>OS: precifica (catálogo/peças) e RESERVA estoque
  OS-)BI: GerarOrcamento
  BI->>C: e-mail com o orçamento e o link
  BI--)OS: OrcamentoGerado → OS AGUARDANDO_APROVACAO (timeout armado)
  C->>BI: POST /api/orcamentos/:id/aprovar
  BI--)OS: OrcamentoAprovado
  OS-)BI: SolicitarPagamento
  BI->>MP: cria preferência (Checkout Pro)
  BI--)OS: PagamentoSolicitado{initPoint} → OS AGUARDANDO_PAGAMENTO (timeout armado)
  C->>MP: paga no checkout (sandbox)
  MP->>BI: webhook payment (x-signature)
  BI->>MP: GET /v1/payments/:id (nunca confia no corpo)
  BI--)OS: PagamentoConfirmado
  OS-)EX: IniciarReparo → OS EM_EXECUCAO
  EX--)OS: ReparoIniciado (aceite) 
  Note over EX: mecânico inicia e conclui o reparo
  EX--)OS: ReparoConcluido
  OS->>OS: baixa DEFINITIVA do estoque, OS FINALIZADA, saga CONCLUIDA
  A->>OS: PATCH /api/ordens-servico/:id/entregar → ENTREGUE (fora da saga)
```

## Passos da Saga

| # | Passo | Executor | Sucesso | Falha | Status da OS |
|---|---|---|---|---|---|
| 1 | Abrir OS | OS (local) | — | validação | `RECEBIDA` |
| 2 | Diagnóstico | Execution | `DiagnosticoConcluido` | `DiagnosticoFalhou` | `EM_DIAGNOSTICO` |
| 3 | Reservar peças | OS (local) | reserva atômica | estoque insuficiente | — |
| 4 | Gerar orçamento | Billing | `OrcamentoGerado` | `OrcamentoFalhou` | `AGUARDANDO_APROVACAO` |
| 5 | Aprovação | Billing (cliente) | `OrcamentoAprovado` | `OrcamentoRecusado` / timeout | — |
| 6 | Pagamento | Billing + MP | `PagamentoConfirmado` | `PagamentoRecusado` / timeout | `AGUARDANDO_PAGAMENTO` |
| 7 | Reparo | Execution | `ReparoConcluido` | `ReparoFalhou` | `EM_EXECUCAO` → `FINALIZADA` |
| 8 | Finalizar | OS (local) | baixa do estoque | — | `FINALIZADA` (ponto sem volta) |

Reentregas e mensagens fora de ordem não avançam a saga: o inbox descarta o `messageId` repetido e o orquestrador
registra respostas de passos já superados como `IGNORADO` (BDD: "mensagem duplicada não avança a saga duas vezes").
