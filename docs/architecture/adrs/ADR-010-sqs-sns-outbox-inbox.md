# ADR-010: SQS + SNS, transactional outbox, inbox idempotente e DLQ

**Status**: Aceita
**Data**: 2026-11-11

## Contexto

A Saga depende de mensagens confiáveis entre serviços. SQS *standard* é
at-least-once e não garante ordem; gravar no banco e publicar na fila são duas
operações não atômicas ("dual write").

## Decisão

- **Comandos** (OS → Billing/Execution): SQS ponto a ponto, uma fila por
  executor. **Eventos** (respostas e eventos do OS): SNS `oficina-eventos`,
  com o OS inscrito por uma fila (`os-saga-replies`) com *filter policy* por
  `type` e *raw message delivery*. Contratos em
  [`contratos-mensagens.md`](../contratos-mensagens.md).
- **Outbox transacional**: a mudança de estado e a mensagem a publicar são
  gravadas na mesma transação (tabela `outbox` no Postgres; item de outbox na
  mesma `TransactWriteItems` no DynamoDB). Um *relay* publica e marca como
  enviada (`FOR UPDATE SKIP LOCKED` no Postgres, seguro com várias réplicas).
  O `messageId` é fixado na gravação, então reenvio não gera mensagem "nova".
- **Inbox**: o consumidor grava `messageId` (`mensagens_processadas` /
  `INBOX#<messageId>` com TTL) na mesma transação do efeito colateral e
  descarta duplicatas.
- **DLQ** por fila, `maxReceiveCount = 5`; alerta se profundidade da DLQ > 0.
- Interface única `IMessageBus` no domínio, adapters `SqsSnsMessageBus` e
  `InMemoryMessageBus` (testes/BDD) — trocar de broker não toca o domínio.

## Consequências

- (+) Sem perda de mensagem entre commit e publicação; duplicatas inofensivas;
  sem pod de broker no cluster; DLQ nativa.
- (−) Latência extra do relay (polling) e consistência eventual; ordem não
  garantida ⇒ handlers validam o estado esperado.
- (−) Código de outbox/inbox/relay replicado nos três repositórios (sem
  pacote compartilhado, ver `PHASE_4_PLAN.md` A3).
- **Concessão do Learner Lab**: filas acessadas via `LabRole` herdada pelos
  nós (sem IRSA), mesma concessão do [`ADR-006`](ADR-006-labrole-compartilhada-sem-irsa.md).
  Numa conta real: uma role por ServiceAccount com permissão mínima por fila.
