# ADR-008: Divisão em três microsserviços (OS, Billing, Execution)

**Status**: Aceita
**Data**: 2026-11-11

## Contexto

O enunciado da Fase 4 exige no mínimo 3 microsserviços independentes e sugere
OS Service, Billing Service e Execution Service. O monólito atual concentra
clientes, veículos, peças/estoque, catálogo, OS e pagamentos num só banco.
Avaliação completa em [`RFC-005`](../rfcs/RFC-005-microsservicos-e-saga.md).

## Decisão

Três serviços, cada um com repositório, banco, pipeline e infraestrutura próprios:

| Serviço | Repositório | Capacidade de negócio | Banco |
|---|---|---|---|
| OS Service (orquestrador) | `soat15-tech-challenge-01` (nome mantido) | Ordens de serviço, status/histórico, cadastros (clientes, veículos, peças/estoque, catálogo), login interno, Saga | PostgreSQL (`oficina_os`) |
| Billing Service | `soat15-tech-challenge-billing-service` | Orçamento, pagamento (Mercado Pago), estorno | PostgreSQL (`oficina_billing`) |
| Execution Service | `soat15-tech-challenge-execution-service` | Fila de execução, diagnóstico e reparo | DynamoDB (`execucoes`) |

Cadastros ficam no OS Service (não viram um 4º serviço) porque são consultados
em praticamente todo passo da OS e a precificação depende do catálogo/peças.

## Consequências

- (+) Mínimo exigido, fronteiras por capacidade de negócio, o repositório atual
  evolui em vez de ser reescrito, links da Fase 3 continuam válidos.
- (−) O OS Service continua o maior; uma futura extração de "Cadastro" é
  possível, pois o acesso a ele já é feito por contratos (mensagens e `/internal`).
- Dados que um serviço precisa de outro viajam **no payload da mensagem**
  (ex.: dados do cliente e preços vão em `GerarOrcamento`), nunca por leitura
  direta do banco alheio.
