# Contratos de Mensagens — Fase 4

**Fonte da verdade** dos contratos entre os três microsserviços (OS Service,
Billing Service, Execution Service). Não há repositório compartilhado de
contratos (ver `PHASE_4_PLAN.md`, A3/A4): cada serviço mantém a própria cópia do
envelope e dos tipos, e **qualquer mudança aqui exige PR nos serviços
afetados**. Os READMEs dos três repositórios linkam este arquivo.

Decisões relacionadas: [`ADR-009`](adrs/ADR-009-saga-orquestrada.md) (Saga),
[`ADR-010`](adrs/ADR-010-sqs-sns-outbox-inbox.md) (SQS/SNS, outbox, inbox, DLQ).

---

## 1. Topologia

| Recurso | Tipo | Dono (Terraform) | Produtores | Consumidor |
|---|---|---|---|---|
| `soat15-tc-<env>-execution-commands` (+ `-dlq`) | SQS | Execution | OS | Execution |
| `soat15-tc-<env>-billing-commands` (+ `-dlq`) | SQS | Billing | OS | Billing |
| `soat15-tc-<env>-oficina-eventos` | SNS | OS | OS, Billing, Execution | — (fan-out) |
| `soat15-tc-<env>-os-saga-replies` (+ `-dlq`) | SQS, inscrita no SNS | OS | SNS | OS |

- **Comandos** vão direto à fila do executor (ponto a ponto): o orquestrador
  sabe quem faz o quê.
- **Eventos** (respostas dos participantes e eventos do OS) são publicados no
  tópico SNS: quem publica não sabe quem consome.
- A assinatura da `os-saga-replies` usa **raw message delivery** (o corpo da
  mensagem SQS é o envelope, sem o invólucro do SNS) e uma *filter policy* por
  `type` listando apenas os eventos de resposta da seção 4 — assim o OS não
  recebe de volta os próprios eventos (`OrdemServicoStatusAlterado`).
- Todas as filas: `maxReceiveCount = 5` para a DLQ, retenção de 4 dias,
  `visibility_timeout` ≥ 6× o timeout do consumidor, long polling de 20 s.

## 2. Envelope

Todo comando e todo evento trafega neste envelope (corpo da mensagem, JSON UTF-8):

```json
{
  "messageId": "0b7d6c0e-3c1a-4f0e-9b57-2d4c0f6a5d11",
  "type": "GerarOrcamento",
  "version": 1,
  "sagaId": "5f1b8e2a-7c34-4d8e-a0a1-9c3b6e2d1f40",
  "correlationId": "c9a1d6f4-2e0b-4a77-8d5c-1b6e9f3a7c02",
  "occurredAt": "2026-11-11T14:32:10.123Z",
  "payload": { }
}
```

| Campo | Regra |
|---|---|
| `messageId` | UUID v4 gerado pelo **produtor**; chave de idempotência do consumidor (inbox). **Reenvios da mesma mensagem (outbox relay) mantêm o mesmo `messageId`.** |
| `type` | Nome do comando/evento (PascalCase, ver catálogo). |
| `version` | Inteiro da versão do **payload** daquele `type`. Mudança incompatível ⇒ nova versão; o consumidor deve aceitar a versão atual e a anterior durante a transição, e rejeitar (→ DLQ) versões desconhecidas. |
| `sagaId` | UUID da instância da Saga (`saga_instancias.id` no OS). Obrigatório em todas as mensagens do fluxo da OS. |
| `correlationId` | O mesmo `x-correlation-id` da requisição HTTP que originou a saga; propagado em todos os logs. |
| `occurredAt` | ISO-8601 UTC, instante em que o fato ocorreu/o comando foi emitido. |
| `payload` | Objeto específico do `type`. Sempre contém `ordemServicoId`. |

### MessageAttributes (SQS/SNS)

Duplicam metadados do envelope para permitir *filter policy* e tracing sem
parsear o corpo:

| Atributo | Tipo | Conteúdo |
|---|---|---|
| `type` | String | `envelope.type` — **usado pela filter policy do SNS** |
| `sagaId` | String | `envelope.sagaId` |
| `correlationId` | String | `envelope.correlationId` |
| `newrelic` / `traceparent` / `tracestate` | String | Headers de distributed tracing (ver Etapa 7 do plano) |

### Regras gerais de consumo

1. **At-least-once**: o consumidor **deve** ser idempotente. O inbox grava
   `messageId` na mesma transação do efeito colateral; se já existir, a
   mensagem é confirmada (delete) sem reprocessar.
2. **Delete só após commit.** Falha de processamento ⇒ não apaga (volta à fila
   pelo `visibility_timeout`; após 5 recebimentos vai para a DLQ).
3. **Erro permanente** (payload inválido, versão desconhecida) ⇒ não adianta
   tentar de novo: registrar em log estruturado com `messageId`/`type` e
   encaminhar à DLQ imediatamente (receive count forçado) — nunca descartar
   silenciosamente.
4. **Ordem não é garantida** (filas *standard*). Os handlers validam o estado
   esperado e tratam mensagens fora de ordem/atrasadas como no-op idempotente
   (ex.: `CancelarOrcamento` de orçamento inexistente responde
   `OrcamentoCancelado` mesmo assim).
5. **Resposta sempre**: todo comando gera exatamente um evento de resposta
   (sucesso ou falha) — o orquestrador depende disso para avançar ou compensar.
6. **Valores monetários** como `number` com 2 casas decimais (BRL), nunca string.
   **Datas** sempre ISO-8601 UTC.

---

## 3. Comandos (OS → participantes)

### 3.1 Para o Execution (`execution-commands`)

| Type | v | Payload | Resposta (evento) |
|---|---|---|---|
| `SolicitarDiagnostico` | 1 | `ordemServicoId`, `numeroOS`, `clienteId`, `veiculoId`, `placa`, `descricaoProblema?`, `prioridade` (`NORMAL`\|`ALTA`) | `DiagnosticoIniciado` / `DiagnosticoFalhou` |
| `IniciarReparo` | 1 | `ordemServicoId`, `execucaoId` | `ReparoIniciado` (seguido de `ReparoConcluido` \| `ReparoFalhou` quando o mecânico agir) |
| `CancelarExecucao` | 1 | `ordemServicoId`, `execucaoId?`, `motivo` | `ExecucaoCancelada` |

```json
{ "type": "SolicitarDiagnostico", "version": 1,
  "payload": { "ordemServicoId": "…", "numeroOS": "OS-20261111-0007",
    "clienteId": "…", "veiculoId": "…", "placa": "ABC1D23",
    "descricaoProblema": "Barulho na suspensão dianteira", "prioridade": "NORMAL" } }
```

### 3.2 Para o Billing (`billing-commands`)

| Type | v | Payload | Resposta (evento) |
|---|---|---|---|
| `GerarOrcamento` | 1 | `ordemServicoId`, `numeroOS`, `cliente{id, nome, email, cpfCnpj}`, `itens[{tipo, referenciaId, descricao, quantidade, valorUnitario}]`, `valorTotal`, `validadeAte` | `OrcamentoGerado` / `OrcamentoFalhou` |
| `CancelarOrcamento` | 1 | `ordemServicoId`, `orcamentoId?`, `motivo` | `OrcamentoCancelado` |
| `SolicitarPagamento` | 1 | `ordemServicoId`, `orcamentoId` | `PagamentoSolicitado` / `PagamentoRecusado` |
| `EstornarPagamento` | 1 | `ordemServicoId`, `pagamentoId`, `motivo` | `PagamentoEstornado` / `EstornoFalhou` |

`itens[].tipo` ∈ `SERVICO` \| `PECA`; `referenciaId` é o **id do serviço da OS**
(`SERVICO`) ou o `pecaId` (`PECA`), ambos do OS Service. **A precificação é do OS Service** (dono do catálogo e
das peças); o Billing só registra e cobra o que recebeu.

```json
{ "type": "GerarOrcamento", "version": 1,
  "payload": { "ordemServicoId": "…", "numeroOS": "OS-20261111-0007",
    "cliente": { "id": "…", "nome": "Maria Silva", "email": "maria@example.com", "cpfCnpj": "12345678909" },
    "itens": [
      { "tipo": "SERVICO", "referenciaId": "…", "descricao": "Troca de amortecedor", "quantidade": 1, "valorUnitario": 250.00 },
      { "tipo": "PECA", "referenciaId": "…", "descricao": "Amortecedor dianteiro", "quantidade": 2, "valorUnitario": 180.00 } ],
    "valorTotal": 610.00, "validadeAte": "2026-11-18T23:59:59.000Z" } }
```

---

## 4. Eventos (participantes → OS, via SNS `oficina-eventos`)

### 4.1 Execution

| Type | v | Payload | Significado para a Saga |
|---|---|---|---|
| `DiagnosticoIniciado` | 1 | `ordemServicoId`, `execucaoId` | OS → `EM_DIAGNOSTICO`; guarda `execucaoId` |
| `DiagnosticoConcluido` | 1 | `ordemServicoId`, `execucaoId`, `servicos[{catalogoServicoId, pecas[{pecaId, quantidade}]}]`, `observacoes?` | Dispara precificação + reserva de estoque + `GerarOrcamento` |
| `DiagnosticoFalhou` | 1 | `ordemServicoId`, `execucaoId?`, `motivo` | Compensa e cancela a OS |
| `ReparoIniciado` | 1 | `ordemServicoId`, `execucaoId` | Confirma `EM_EXECUCAO` |
| `ReparoConcluido` | 1 | `ordemServicoId`, `execucaoId`, `observacoes?` | Finaliza a OS (baixa definitiva do estoque) |
| `ReparoFalhou` | 1 | `ordemServicoId`, `execucaoId`, `motivo` | Inicia compensação completa (inclui estorno) |
| `ExecucaoCancelada` | 1 | `ordemServicoId`, `execucaoId?` | Confirma compensação do passo de execução |

### 4.2 Billing

| Type | v | Payload | Significado para a Saga |
|---|---|---|---|
| `OrcamentoGerado` | 1 | `ordemServicoId`, `orcamentoId`, `valorTotal`, `validadeAte` | OS → `AGUARDANDO_APROVACAO` |
| `OrcamentoFalhou` | 1 | `ordemServicoId`, `motivo` | Compensa (libera reserva, cancela OS) |
| `OrcamentoAprovado` | 1 | `ordemServicoId`, `orcamentoId`, `aprovadoEm` | Orquestrador envia `SolicitarPagamento` |
| `OrcamentoRecusado` | 1 | `ordemServicoId`, `orcamentoId`, `motivo?` | Compensa (libera reserva, cancela execução e OS) |
| `OrcamentoCancelado` | 1 | `ordemServicoId`, `orcamentoId?` | Confirma compensação do orçamento |
| `PagamentoSolicitado` | 1 | `ordemServicoId`, `orcamentoId`, `pagamentoId`, `initPoint`, `expiraEm` | OS → `AGUARDANDO_PAGAMENTO`; `initPoint` fica disponível ao cliente |
| `PagamentoConfirmado` | 1 | `ordemServicoId`, `orcamentoId`, `pagamentoId`, `mpPaymentId`, `valor`, `confirmadoEm` | Orquestrador envia `IniciarReparo` |
| `PagamentoRecusado` | 1 | `ordemServicoId`, `orcamentoId`, `pagamentoId?`, `motivo` | Compensa (cancela orçamento, libera reserva, cancela execução e OS) |
| `PagamentoEstornado` | 1 | `ordemServicoId`, `pagamentoId`, `mpRefundId` | Confirma compensação do pagamento |
| `EstornoFalhou` | 1 | `ordemServicoId`, `pagamentoId`, `motivo` | Retentável; esgotadas as tentativas ⇒ saga `FALHA_COMPENSACAO` + alerta |

### 4.3 Publicados pelo OS (não consumidos pela Saga)

| Type | v | Payload | Uso |
|---|---|---|---|
| `OrdemServicoStatusAlterado` | 1 | `ordemServicoId`, `numeroOS`, `statusAnterior`, `statusNovo`, `motivo?` | Integração/observabilidade; **fora** da filter policy de `os-saga-replies` |

---

## 5. Mapa Saga: evento → próxima ação do orquestrador

| Evento recebido | Próxima ação |
|---|---|
| `DiagnosticoIniciado` | OS `EM_DIAGNOSTICO` |
| `DiagnosticoConcluido` | precifica + reserva estoque (local) → `GerarOrcamento` |
| `OrcamentoGerado` | OS `AGUARDANDO_APROVACAO`, arma timeout de aprovação |
| `OrcamentoAprovado` | `SolicitarPagamento` |
| `PagamentoSolicitado` | OS `AGUARDANDO_PAGAMENTO`, arma timeout de pagamento |
| `PagamentoConfirmado` | `IniciarReparo` |
| `ReparoIniciado` | OS `EM_EXECUCAO` |
| `ReparoConcluido` | baixa estoque, OS `FINALIZADA`, saga `CONCLUIDA` |
| `DiagnosticoFalhou` / `OrcamentoFalhou` / `OrcamentoRecusado` / `PagamentoRecusado` / `ReparoFalhou` / timeout / cancelamento manual | **Compensação** em ordem inversa a partir do último passo concluído |
| `OrcamentoCancelado` / `PagamentoEstornado` / `ExecucaoCancelada` | Avança a compensação; ao fim, OS `CANCELADA`, saga `COMPENSADA`, notificação |
| `EstornoFalhou` (e demais falhas de compensação) | Retry; esgotado ⇒ `FALHA_COMPENSACAO` |

## 6. Versionamento e evolução

- Adicionar campo **opcional** ao payload: compatível, sem mudar `version`.
- Remover/renomear campo, mudar tipo ou semântica: **nova `version`**; produtor
  passa a emitir a nova, consumidores aceitam as duas até todos migrarem.
- Novo `type`: documentar aqui **antes** de implementar; se for um evento de
  resposta da Saga, incluir na filter policy da `os-saga-replies`.
