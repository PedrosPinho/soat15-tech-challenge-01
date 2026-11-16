# ADR-011: DynamoDB como banco NoSQL do Execution Service

**Status**: Aceita
**Data**: 2026-11-11

## Contexto

O enunciado exige ao menos um banco relacional e um não relacional no
conjunto. O Execution Service gerencia uma **fila de execução** e o histórico
de etapas (diagnóstico/reparo) — acesso quase sempre por chave
(`execucaoId`, `ordemServicoId`) e por "próximos da fila", sem joins.

## Decisão

DynamoDB, tabela única `execucoes` em modo on-demand:

- `PK=EXEC#<id>`, `SK=META` (estado atual), `SK=EVT#<timestamp>` (histórico);
- GSI1 (`status#prioridade` → ordem de chegada) para a fila;
- GSI2 por `ordemServicoId`;
- itens de outbox e `INBOX#<messageId>` (com TTL) na mesma tabela, gravados em
  `TransactWriteItems` com o estado;
- concorrência por `ConditionExpression` (transição só se o estado atual for o esperado).

Local e em testes: LocalStack.

## Consequências

- (+) Sem servidor/instância para operar, sem custo fixo, escala sem ajuste; o
  modelo de acesso do serviço cabe bem em chave-valor.
- (+) Atende "NoSQL" sem StatefulSet no cluster pequeno.
- (−) Consultas ad hoc/relatórios são limitadas ao que os índices permitem
  (aceitável: relatórios ficam no OS Service).
- (−) Modelagem single-table é menos intuitiva — documentada em
  `data-model.md` do serviço.
- Alternativa descartada: MongoDB no cluster (mais um StatefulSet, sem backup, recriado a cada sessão).
