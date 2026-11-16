# RFC-005: Decomposição em microsserviços e estratégia de Saga

**Status**: Aceita
**Data**: 2026-11-11
**Autor(es)**: Time Tech Challenge SOAT (Fase 4)

## Contexto

O enunciado da Fase 4 exige refatorar a aplicação para **no mínimo 3
microsserviços independentes** (cada um com repositório, infraestrutura e banco
próprios, com ao menos um SQL e um NoSQL no conjunto), comunicação
REST + mensageria assíncrona, **proibição de acesso direto ao banco de outro
serviço**, e **Saga Pattern com rollback/compensação** para o fluxo
*abrir OS → gerar orçamento → aguardar aprovação → pagar → executar*, justificando
a escolha orquestrada vs. coreografada no README.

Ponto de partida: monólito modular (DDD em camadas, Node/TS/Express, PostgreSQL)
rodando em EKS, com 3 repositórios satélites de infraestrutura. Restrições:
AWS Academy Learner Lab (IAM bloqueado, orçamento limitado, sessões de ~4 h),
cluster pequeno, prazo de curso.

## Alternativas consideradas

### A. Decomposição

| Alternativa | Prós | Contras |
|---|---|---|
| **A1. 3 serviços: OS, Billing, Execution** (sugerida pelo enunciado) | Mínimo exigido; fronteiras claras por capacidade de negócio; o repo atual vira o OS Service (menor reescrita); 2 serviços novos | OS Service concentra cadastros (clientes, veículos, peças, catálogo) |
| A2. 4 serviços (+ Cadastro) | Fronteiras mais puras; OS Service enxuto | +1 repo/pipeline/banco/deploy; clientes/peças são consultados em quase todo passo ⇒ muito tráfego síncrono entre serviços; cabe mal no cluster e no prazo |
| A3. Serviço por entidade (cliente, veículo, peça, OS, pagamento…) | "Máxima" granularidade | Distributed monolith: transações triviais viram sagas; custo operacional desproporcional |

### B. Estratégia de Saga

| Alternativa | Prós | Contras |
|---|---|---|
| **B1. Orquestrada** (orquestrador no OS Service) | Fluxo e compensações em **um só lugar**, legível e testável (BDD); estado da saga consultável e auditável; fácil de demonstrar e depurar; participantes ignoram o fluxo global | Orquestrador é ponto de acoplamento lógico (conhece todos os passos); precisa ser persistente e resiliente |
| B2. Coreografada | Menor acoplamento; sem coordenador central | Fluxo e compensações **espalhados** em 3 serviços; difícil responder "em que passo está a OS X?"; risco de ciclos de eventos; BDD do fluxo completo exige subir tudo |

### C. Mensageria

| Alternativa | Prós | Contras |
|---|---|---|
| **C1. SQS + SNS** | Gerenciado, Terraform, DLQ nativa, sem pod no cluster, acesso pela `LabRole` | Filas *standard* ⇒ at-least-once e sem ordem garantida (exige idempotência) |
| C2. RabbitMQ no cluster | Portável, roteamento rico | Consome memória dos nós, dado perdido a cada `destroy`, operação nossa |
| C3. Kafka (MSK) | Log durável, replay | Custo/complexidade desproporcionais ao Learner Lab |

## Decisão

- **A1**: OS Service (repositório atual, nome mantido), Billing Service e
  Execution Service — ver `ADR-008`.
- **B1**: Saga **orquestrada**, orquestrador dentro do OS Service, estado
  persistido em `saga_instancias`/`saga_passos_log` com lock otimista —
  ver `ADR-009`. Justificativa central: o requisito de "rollback seguro" e a
  demonstração em vídeo exigem que o caminho de compensação seja **explícito e
  observável**; com 3 serviços e um fluxo linear de 7 passos, o ganho de
  desacoplamento da coreografia não compensa a perda de visibilidade.
- **C1**: SQS (comandos, ponto a ponto) + SNS (eventos, fan-out) com
  *transactional outbox*, *inbox* idempotente e DLQ — ver `ADR-010`.
- Bancos: PostgreSQL no OS e no Billing (dados relacionais/transacionais),
  DynamoDB no Execution (fila e histórico de etapas, acesso por chave) —
  `ADR-011`/`ADR-012`.
- Pagamento via **Mercado Pago Checkout Pro**, **após** a aprovação do
  orçamento e antes da execução — `ADR-014`.

## Consequências

- **Ganho**: três unidades de deploy/escala/falha independentes; Saga
  demonstrável com compensações reais (estorno no Mercado Pago, liberação de
  estoque, cancelamento de execução); resiliência a indisponibilidade
  temporária de um participante (mensagens aguardam na fila).
- **Custo**: consistência **eventual** — a OS passa por estados intermediários
  visíveis ao cliente; é preciso desenhar timeouts e a UX desses estados.
- **Custo**: três pipelines, três conjuntos de testes e contratos de mensagem
  versionados à mão (`contratos-mensagens.md`) sem repositório compartilhado.
- **Risco**: o orquestrador é um ponto crítico — mitigado por persistência do
  estado, lock otimista, sweeper de timeout e a saga em `FALHA_COMPENSACAO`
  com alerta quando a compensação não converge.
- **Risco**: filas *standard* ⇒ duplicidade/desordem — mitigado por inbox,
  handlers idempotentes e verificação de estado esperado.

## Referências

- [`PHASE_4_PLAN.md`](../../PHASE_4_PLAN.md), [`contratos-mensagens.md`](../contratos-mensagens.md)
- ADR-008 a ADR-015
- Chris Richardson, *Microservices Patterns* — Saga, Transactional Outbox
- Enunciado: `SOAT - Fase 4 - Tech challenge.pdf`
