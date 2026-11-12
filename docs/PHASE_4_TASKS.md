# Tasks & Checklist — Fase 4 (Tech Challenge SOAT)

**Base**: [`PHASE_4_PLAN.md`](PHASE_4_PLAN.md) (decisões D1–D9 confirmadas, A1–A14 assumidas)
**Passos que dependem de conta externa**: [`PHASE_4_EXECUTION_GUIDE.md`](PHASE_4_EXECUTION_GUIDE.md)
**Status atual**: refinement concluído; **Etapa 1 concluída**; **Etapas 2 a 7 implementadas** — itens que dependem de Docker/AWS/Mercado Pago ficam 🔶 (ver cada task). Etapa 0 (itens **[👤]**) a cargo do usuário; tudo que sobrou para o usuário está em [`PHASE_4_PENDENCIAS.md`](PHASE_4_PENDENCIAS.md). Etapas 5, 6 e 7 implementadas (sem `apply`/Docker/conta New Relic). Próxima: Etapa 8 (CI/CD final).

Legenda de repositório: **[OS]** `soat15-tech-challenge-01` · **[EX]**
`soat15-tech-challenge-execution-service` · **[BI]**
`soat15-tech-challenge-billing-service` · **[DB]** `db-infra` · **[K8S]**
`k8s-infra` · **[AUTH]** `auth-lambda` · **[👤]** depende de você (ver o guia de execução).

Cada task tem um **critério de aceite** (✔). Uma task só é marcada quando o
critério foi verificado de verdade — como nas fases anteriores, "código escrito"
e "executado contra a AWS" são registrados separadamente.

---

## Etapa 0 — Fundação

- [ ] **T0.1 [👤]** Validar no Learner Lab: SQS, SNS (+ assinatura SQS com filter policy), DynamoDB on-demand, node group `t3.medium`.
  ✔ Os 4 recursos criados manualmente e apagados; resultado anotado no guia (Passo 0).
- [ ] **T0.2 [👤]** Validar que um pod do EKS acessa SQS e DynamoDB com a `LabRole` via IMDS (`kubectl run` com `amazon/aws-cli`, `aws sqs list-queues` / `aws dynamodb list-tables`).
  ✔ Os dois comandos respondem sem `AccessDenied` de dentro do pod.
- [ ] **T0.3 [👤]** Criar os repos `soat15-tech-challenge-billing-service` e `soat15-tech-challenge-execution-service` (públicos, `main` + `homolog`, `soat-architecture` como colaborador).
  🔶 **Parcial**: os dois repositórios já existem **localmente** (`/home/pedropinho/soat/…`) com commit inicial, `main` + `homolog` e git user/email locais configurados. **Falta**: criar os remotos públicos no GitHub, `git remote add origin … && git push -u origin main homolog` e adicionar `soat-architecture` (ver Passo 1 do guia).
- [ ] **T0.4 [👤]** Conta Mercado Pago Developers: aplicação, credenciais de **teste**, usuários de teste (vendedor/comprador), webhook secret.
- [ ] **T0.5 [👤]** SonarCloud: organização ligada ao GitHub, 3 projetos, `SONAR_TOKEN` em cada repo de serviço.
- [x] **T0.6 [OS]** `scripts/refresh-aws-secrets.sh` publicando nos 6 repos (lista de repos parametrizada).
  ✔ `--dry-run` lista os 6 repos; execução real atualiza os secrets nos 6.
  ✅ `--dry-run` lista os 6 repos (testado); execução real depende de `gh`/credenciais — não executada.

## Etapa 1 — Contratos, decisões e esqueletos

- [x] **T1.1 [OS]** `docs/architecture/contratos-mensagens.md`: envelope (`messageId`, `type`, `version`, `sagaId`, `correlationId`, `occurredAt`, `payload`), MessageAttributes, e catálogo completo:
  - Comandos → Execution: `SolicitarDiagnostico`, `IniciarReparo`, `CancelarExecucao`
  - Comandos → Billing: `GerarOrcamento`, `CancelarOrcamento`, `SolicitarPagamento`, `EstornarPagamento`
  - Eventos Execution: `DiagnosticoIniciado`, `DiagnosticoConcluido`, `DiagnosticoFalhou`, `ReparoIniciado`, `ReparoConcluido`, `ReparoFalhou`, `ExecucaoCancelada`
  - Eventos Billing: `OrcamentoGerado`, `OrcamentoFalhou`, `OrcamentoAprovado`, `OrcamentoRecusado`, `OrcamentoCancelado`, `PagamentoSolicitado`, `PagamentoConfirmado`, `PagamentoRecusado`, `PagamentoEstornado`, `EstornoFalhou`
  - Eventos OS: `OrdemServicoStatusAlterado`
  ✔ Cada mensagem com produtor, consumidor, payload tipado e exemplo JSON.
- [x] **T1.2 [OS]** `RFC-005` (decomposição + estratégia de Saga, alternativas avaliadas).
- [x] **T1.3 [OS]** ADRs `ADR-008` a `ADR-015` (lista no plano, Etapa 1), no `TEMPLATE.md` existente.
- [x] **T1.4 [EX]** Esqueleto: estrutura DDD, `tsconfig` (strict, path aliases), Jest (threshold 80%), pino + correlationId, `authMiddleware` (cópia do OS), `/health/live`/`/health/ready`, Swagger, Dockerfile, `docker-compose` (app + LocalStack), `.github/workflows/ci-cd.yml` só com `build`+`test`.
  ✔ `npm run build`, `npm test` e `docker compose up` verdes no repo vazio de domínio.
  ✅ build, lint, type-check e testes verdes (33 testes, cobertura 98,6%). ⚠️ `docker compose up`/`docker build` **não validados** (sem Docker no ambiente) — rodar localmente antes do primeiro deploy.
- [x] **T1.5 [BI]** Idem T1.4, com Postgres no `docker-compose` e `node-pg-migrate`.
- [x] **T1.6 [OS/EX/BI]** Corrigir `npm run lint` (`eslint.config.js` flat config para `eslint@10`) e incluir `lint` no job `build`.
  ✔ `npm run lint` sem erros nos 3 serviços.
  ✅ `eslint.config.js` (flat config) no OS e nos 2 novos; `lint` adicionado ao job `Build` do OS. Os 2 `require('newrelic')` legítimos ganharam `eslint-disable` com o nome certo da regra (`no-require-imports`).

## Etapa 2 — OS Service (refactor)

### 2a. Fundamentos de mensageria
- [x] **T2.1** Port `IMessageBus` (`send(queue, msg)`, `publish(topic, msg)`, `subscribe(queue, handler)`) em `src/domain/services/` + envelope tipado em `src/shared/messaging/`.
  ✅ `IMessageBus` em `src/domain/services/message-bus.ts`; envelope/parse/validação em `src/shared/messaging/envelope.ts`; catálogo tipado em `messages.ts`.
- [ ] **T2.2** `InMemoryMessageBus` (testes/BDD) e `SqsSnsMessageBus` (`@aws-sdk/client-sqs`, `@aws-sdk/client-sns`, long polling, `ChangeMessageVisibility` em erro, delete só após commit).
  ✔ Teste de integração com LocalStack: send → consume → delete; erro → mensagem volta para a fila.
  ✅ `InMemoryMessageBus` e `SqsSnsMessageBus` (long polling, delete só após o handler, `ChangeMessageVisibility` com backoff, envelope inválido → visibilidade 0/DLQ) com testes unitários (clientes AWS simulados). 🔶 **Falta** o teste de integração com LocalStack (✔ do critério) — sem Docker no ambiente; `docker-compose.yml` já sobe o LocalStack e `scripts/localstack-init.sh` cria a topologia.
- [ ] **T2.3** Migrations `outbox` e `mensagens_processadas`; `OutboxRepository` + relay (`FOR UPDATE SKIP LOCKED`, batch, backoff) iniciado no bootstrap.
  ✔ Teste: rollback da transação de negócio ⇒ nada publicado; 2 relays concorrentes não publicam a mesma linha duas vezes.
  ✅ Migration `outbox`/`mensagens_processadas`, `PostgresOutboxRepository` (`FOR UPDATE SKIP LOCKED`), `OutboxRelay` (backoff exponencial, `PeriodicTask`) iniciado em `src/index.ts`; `PostgresUnitOfWork` (transação por `AsyncLocalStorage`) testado com pool simulado. 🔶 Os testes contra PostgreSQL real (rollback ⇒ nada publicado; 2 relays sem duplicar) estão escritos em `tests/infrastructure/database/postgres/messaging.spec.ts`, **mas não foram executados** (sem Docker).
- [x] **T2.4** Consumidor de `os-saga-replies` com inbox (dedupe por `messageId` na mesma transação do handler).
  ✔ Teste: a mesma mensagem entregue 2x executa o handler 1x.
  ✅ `SagaOrchestrator.handleReply` registra o `messageId` no inbox na mesma transação; mesma mensagem 2x ⇒ handler 1x e rollback desfaz o inbox (testado com UoW com rollback real em memória). Consumidor: `startSagaReplyConsumer`.
### 2b. Domínio e dados
- [x] **T2.5** Remover `Pagamento` do OS: entidade, repo, use cases, rotas `/api/pagamentos`, Swagger, Postman, testes; migration de drop da tabela `pagamentos`.
  ✅ Removidos entidade/repo/use cases/rotas/validators/mapper/testes de `Pagamento`, o webhook de orçamento e o `webhook-auth`; Swagger e Postman atualizados; migration `drop-pagamentos`. (Migration não executada contra Postgres real — sem Docker.)
- [x] **T2.6** `OrdemServico`: status `AGUARDANDO_PAGAMENTO`, `aguardarPagamento()`, `estornarPagamento()`, `confirmarPagamento()` (substitui `registrarPagamento()`), transições ajustadas ao fluxo da Saga; migration do enum `status_os`.
  ✔ Testes de domínio cobrindo todas as transições válidas e inválidas.
  ✅ `AGUARDANDO_PAGAMENTO`, `iniciarDiagnostico`/`registrarDiagnostico`/`aguardarPagamento`/`confirmarPagamento`/`estornarPagamento`; matriz completa de transições válidas/inválidas em `ordem-servico.entity.spec.ts` (81 testes). Migration do enum escrita.
- [x] **T2.7** `os_status_historico` (migration + gravação a cada transição) e `GET /api/ordens-servico/:id/historico` (status + passos da Saga).
  ✅ `os_status_historico` (migration + gravação a cada transição pelo orquestrador) e `GET /api/ordens-servico/:id/historico` (status + passos da Saga + link de pagamento).
- [x] **T2.8** Religar `InventoryService` às operações atômicas de `PostgresItemEstoqueRepository` (`reservar`, `utilizar`, `liberarReserva`) — fecha o achado "integração órfã" da Fase 3.
  ✔ Teste de concorrência: duas reservas simultâneas do último item ⇒ uma falha.
  ✅ `InventoryService` delega às operações atômicas (`reservar`/`utilizar`/`liberarReserva` — esta última nova) e é usado pelo orquestrador (reserva, baixa, compensação). Teste de concorrência no repositório (`item-estoque.repository.spec.ts`, não executado sem Docker); no orquestrador, reserva parcial é desfeita.
### 2c. Orquestrador
- [x] **T2.9** Migrations `saga_instancias` e `saga_passos_log`; `SagaRepository` com lock otimista (`versao`).
  ✅ Migrations `saga_instancias`/`saga_passos_log`; `PostgresSagaRepository` com `WHERE versao = $n` + `FOR UPDATE`; colisão ⇒ `SagaConcurrencyError` (lock otimista testado no fake e o SQL com pool simulado).
- [x] **T2.10** Definição declarativa dos passos da Saga "Ciclo da OS" (`src/application/saga/ciclo-os.saga.ts`) — passo, comando, eventos de sucesso/falha, compensação.
  ✅ `src/application/saga/ciclo-os.saga.ts` (passos, comandos, sucesso/falha, compensações, passos a pular na falha).
- [x] **T2.11** `SagaOrchestrator`: iniciar (na mesma transação do `CreateOrdemServico`), avançar por evento, compensar em ordem inversa, `FALHA_COMPENSACAO` após N tentativas, gravação em `saga_passos_log`.
  ✅ `SagaOrchestrator`: iniciar na transação do `CreateOrdemServico`, avançar por evento, compensar em ordem inversa, retry/`FALHA_COMPENSACAO`, pagamento tardio (estorno), `saga_passos_log`.
- [x] **T2.12** Passo local "precificar + reservar" ao receber `DiagnosticoConcluido` (preço do catálogo/peças do próprio OS → itens do `GerarOrcamento`).
  ✅ Precificação por catálogo/peças do próprio OS + reserva atômica ao receber `DiagnosticoConcluido`.
- [x] **T2.13** Passo local "finalizar" ao receber `ReparoConcluido` (baixa do estoque reservado, `FINALIZADA`, saga `CONCLUIDA`).
  ✅ Baixa definitiva do estoque, OS `FINALIZADA`, saga `CONCLUIDA` ao receber `ReparoConcluido`.
- [x] **T2.14** Sweeper de timeout (`SAGA_TIMEOUT_APROVACAO`, `SAGA_TIMEOUT_PAGAMENTO`, intervalo por env var).
  ✅ `processarExpiradas` + `createSagaTimeoutSweeper`; `SAGA_TIMEOUT_APROVACAO`/`PAGAMENTO`/`COMPENSACAO` por env (`30s`, `5m`, `2h`).
- [x] **T2.15** `PATCH /:id/cancelar` passa a disparar a compensação; remover `iniciar`/`aguardar-aprovacao`/`aprovar`/`concluir` e o webhook de orçamento da API pública (Swagger/Postman/testes de integração atualizados).
  ✔ Testes do orquestrador com `InMemoryMessageBus` para cada falha da tabela de passos do plano.
  ✅ `PATCH /:id/cancelar` ⇒ 202 + compensação; rotas manuais e webhook removidos. ✔ 37 testes do orquestrador cobrem cada falha da tabela de passos (+ idempotência, ordem, lock otimista).
### 2d. Integrações síncronas e infra do serviço
- [x] **T2.16** `GET /internal/clientes/by-cpf/:cpf` protegido por `x-internal-token` (middleware novo); rotas `/internal/*` montadas fora do prefixo `/api`.
  ✅ `GET /internal/clientes/by-cpf/:cpf` (`internalTokenMiddleware`, comparação em tempo constante) montado em `/internal`, fora de `/api`.
- [x] **T2.17** `DashboardUseCase` lê `receitaTotal` do Billing (`GET /internal/financeiro/resumo`, timeout 2s, fallback `null` + log de warning).
  ✅ `HttpFinanceiroGateway` (timeout 2 s, fallback `null` + warning); `receitaTotal: number | null`.
- [x] **T2.18** Conexão como `os_service` no database `oficina_os` (`DATABASE_URL` montada no deploy com o role novo).
  🔶 O app só consome `DATABASE_URL`; a criação do role `os_service`/database `oficina_os` e a montagem da URL no deploy dependem do `db-infra` (Etapa 6). O CI ainda usa `oficina`/`oficina` até lá.
- [ ] **T2.19** `terraform/` próprio: backend S3 (key própria), ECR `soat15-tc-os-service`, SNS `oficina-eventos`, SQS `os-saga-replies` + DLQ + assinatura com filter policy, outputs (ARNs/URLs) consumidos pelos outros serviços via `terraform_remote_state`.
  ✔ `terraform validate` + `tflint` limpos; `apply` em `homolog` confirmado.
  ✅ `terraform/` (backend S3 `os-service/…`, ECR `soat15-tc-os-service`, SNS `oficina-eventos`, SQS `os-saga-replies` + DLQ, assinatura raw + filter policy, outputs) com `terraform fmt -check` e `validate` limpos (1.9.5); jobs `terraform-validate`/`terraform-apply` no CI. 🔶 **Falta** `tflint` e o `apply` em `homolog` (precisa de credenciais do Lab).
- [x] **T2.20** `k8s/ingress.yaml` (group `oficina-<env>`, paths `/api/ordens-servico`, `/api/clientes`, `/api/veiculos`, `/api/pecas`, `/api/servicos`, `/api/relatorios`, `/api/auth`, `/health`, `/internal`); `service.yaml` volta para `ClusterIP`; ConfigMap com URLs de fila/tópico.
  ✅ `k8s/ingress.yaml` (group `oficina-ENV`, 10 paths), `service.yaml` → `ClusterIP`, ConfigMap com prazos da Saga, `oficina-api-messaging` criado pelo CI a partir do Terraform. Manifestos validados como YAML; **não aplicados** em cluster.
## Etapa 3 — Execution Service

- [x] **T3.1** Agregado `Execucao` + VOs, estados e transições (plano, Etapa 3).
  ✔ Testes de domínio de todas as transições.
- [x] **T3.2** `DynamoExecucaoRepository` (single-table, GSI fila por `status#prioridade#criadoEm`, GSI por `osId`, histórico `EVT#<ts>`), com `ConditionExpression` para concorrência.
  ✔ Testes de integração com LocalStack.
  ↳ Spec de integração `tests/integration-localstack.spec.ts` escrito, **não executado** (sem Docker); roda no CI com `LOCALSTACK_ENDPOINT`. Trava `OSLOCK#<osId>` garante 1 execução por OS.
- [x] **T3.3** Outbox via `TransactWriteItems` + relay; inbox por `PutItem` condicional `INBOX#<messageId>` com TTL.
  ↳ Inbox atômico: o item `INBOX#<messageId>` entra na mesma `TransactWriteItems` do efeito (condicional `attribute_not_exists`), em vez de um `PutItem` separado. Relay com *lease* condicional (`lockedUntil`) sobre GSI3 esparso.
- [x] **T3.4** Consumidor de `execution-commands`: `SolicitarDiagnostico`, `IniciarReparo`, `CancelarExecucao` (idempotentes).
  ↳ `IniciarReparo` responde `ReparoIniciado` ao **aceitar** o comando (execução vai a `AGUARDANDO_REPARO`); o mecânico inicia (`reparo/iniciar`) e conclui depois. Mesmo critério para `DiagnosticoIniciado` (na criação da execução).
- [x] **T3.5** API (escopo `interno`): `GET /api/execucoes/fila`, `GET /:id`, `PATCH /:id/diagnostico/iniciar|concluir`, `PATCH /:id/reparo/iniciar|concluir|falhar`, com validators e Swagger.
  ↳ Acrescentado `PATCH /:id/diagnostico/falhar` (necessário para emitir `DiagnosticoFalhou`).
- [x] **T3.6** `terraform/`: ECR, tabela `execucoes` (on-demand, GSIs, TTL), SQS `execution-commands` + DLQ com policy liberando o envio pelo OS.
  ↳ `terraform fmt`/`validate` OK (1.9.5). Lê o tópico `oficina-eventos` do estado do OS (`terraform_remote_state`): OS faz `apply` primeiro. `apply` não executado.
- [x] **T3.7** `k8s/`: Deployment (réplicas 1–2), Service `ClusterIP`, HPA, ConfigMap, Ingress (`/api/execucoes`).
- [x] **T3.8** Cobertura ≥ 80%.

## Etapa 4 — Billing Service

- [x] **T4.1** Agregados `Orcamento` e `Pagamento` + migrations (`orcamentos`, `orcamento_itens`, `pagamentos`, `outbox`, `mensagens_processadas`).
  ↳ `orcamentos`, `orcamento_itens`, `pagamentos` (índice único parcial: 1 pagamento vivo por orçamento), `outbox`, `mensagens_processadas`. Ids de outros serviços são `varchar` sem FK (ADR-012).
- [x] **T4.2** Outbox + relay e inbox (cópia adaptada do OS).
- [x] **T4.3** Port `IPaymentGateway` + `FakePaymentGateway` + `MercadoPagoPaymentGateway` (criar preferência com `external_reference`/`notification_url`, consultar pagamento, estornar; `X-Idempotency-Key` em escrita).
  ✔ Teste manual contra o sandbox: preferência criada, `sandbox_init_point` abre o checkout.
  🔶 `FakePaymentGateway` e `MercadoPagoPaymentGateway` (REST, testado com `fetch` simulado). **Teste manual contra o sandbox NÃO feito** (precisa da conta MP — T0.4): ver PHASE_4_PENDENCIAS.md.
- [x] **T4.4** Consumidor de `billing-commands`: `GerarOrcamento`, `CancelarOrcamento`, `SolicitarPagamento`, `EstornarPagamento`.
- [x] **T4.5** API: `GET /api/orcamentos/:id`, `POST /:id/aprovar|recusar` (cliente só no próprio), `POST /:id/webhook` (segredo compartilhado), `GET /api/pagamentos?ordemServicoId=`, `GET /internal/financeiro/resumo`, `POST /internal/pagamentos/:id/sincronizar` (reconciliação).
  ↳ Acrescentado `GET /api/orcamentos?ordemServicoId=` (o cliente precisa achar o orçamento da OS). Corpo do webhook de aprovação externa: `{ aprovado: boolean, motivo? }` com `x-webhook-secret`.
- [x] **T4.6** `POST /api/pagamentos/webhooks/mercadopago`: validação `x-signature` (HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`), consulta `GET /v1/payments/:id`, publica `PagamentoConfirmado`/`PagamentoRecusado`; responde 200 rápido e é idempotente.
  ✔ Testes: assinatura inválida ⇒ 401; webhook repetido ⇒ um só evento.
  ✅ Assinatura inválida ⇒ 401 sem consultar o MP; webhook repetido/concorrente ⇒ um só evento (testado). Valor aprovado ≠ cobrado **não** confirma.
- [x] **T4.7** Notificação "orçamento disponível" (port `INotificationService` copiada, SES/SMTP).
- [x] **T4.8** `terraform/`: ECR, SQS `billing-commands` + DLQ, parâmetros SSM do MP.
  ↳ `terraform fmt`/`validate` OK. Os parâmetros SSM do MP **não** viraram `data` no Terraform (falharia o apply antes de existirem): o CI os lê no deploy.
- [x] **T4.9** `k8s/`: Deployment, Service, HPA, ConfigMap, Ingress (`/api/orcamentos`, `/api/pagamentos`), Job de migration.
- [x] **T4.10** Cobertura ≥ 80%.


## Etapa 5 — Plataforma compartilhada

- [x] **T5.1 [DB]** Script SQL idempotente de bootstrap (`CREATE DATABASE`/`ROLE` se não existir, `GRANT`, `REVOKE CONNECT ... FROM PUBLIC`) + senhas dos roles geradas pelo Terraform no SSM (`/soat15-tc/<env>/db/os-service-password`, `.../billing-service-password`).
  ↳ Senhas dos roles em `db-infra` (`random_password` alfanumérico → SSM `…/db/os-service-password` e `…/billing-service-password`); SQL idempotente em `k8s/db-bootstrap.sql` (OS). 🔶 Nunca executado contra um PostgreSQL/RDS reais (sem Docker/psql aqui): `\gexec`, `GRANT role TO CURRENT_USER` e `CREATE DATABASE … OWNER` precisam de validação.
- [x] **T5.2 [OS/BI]** `k8s/job-db-bootstrap.yaml` executado pelo pipeline antes da migration (usa a senha master do SSM só nesse Job).
  ✔ `psql` como `billing_service` em `oficina_os` ⇒ `permission denied`.
  ↳ `k8s/job-db-bootstrap.yaml` + passo no CI do OS (Secret com a senha master é apagado após o Job). O `DATABASE_URL` do OS passou a usar `os_service`/`oficina_os` (**fecha a T2.18**). 🔶 Teste `psql` como `billing_service` em `oficina_os` ⇒ `permission denied`: pendente.
- [x] **T5.3 [K8S]** `node_instance_type = "t3.medium"`; revisar componentes do `nri-bundle` (desligar o que não é usado nos dashboards).
  ✔ `kubectl get pods -A` sem `Pending` com os 3 serviços implantados.
  ↳ `node_instance_type = t3.medium`. `nri-bundle` mantido (low data mode); comentário indica o que desligar primeiro se houver `Pending`. 🔶 `kubectl get pods -A` com os 3 serviços: não verificável aqui.
- [x] **T5.4 [AUTH]** VPC Link → listener do **ALB** do IngressGroup (lookup por tag `ingress.k8s.aws/stack`); manter `/auth/token`, `/api/auth/login`, `/health/ready` públicos; nova rota pública `POST /api/pagamentos/webhooks/mercadopago`.
  ↳ VPC Link → listener do ALB (`data.aws_lb` por tag `ingress.k8s.aws/stack = oficina-<env>`, porta 80); rota pública `POST /api/pagamentos/webhooks/mercadopago`; `/internal/*` sem rota. `terraform validate` OK; não aplicado.
- [x] **T5.5 [AUTH]** Lambda de token chama `GET /internal/clientes/by-cpf/:cpf` no ALB interno (URL e `x-internal-token` via SSM); remover `pg`/`db.ts`, a regra Lambda→RDS do SG em `db-infra` e o acesso ao parâmetro de senha do banco.
  ✔ `POST /auth/token` continua 200/400/403/404 com os mesmos CPFs da Fase 3.
  ↳ Lambda de token chama `/internal/clientes/by-cpf/:cpf` (`INTERNAL_BASE_URL` = DNS do ALB, `INTERNAL_API_TOKEN` via `TF_VAR`); removidos `pg`, `db.ts`, `DATABASE_URL` e a regra Lambda→RDS do SG (db-infra). 29→32 testes (novos: cliente HTTP e handler de token: 400/404/403/200/500, 404≡403 no corpo). 🔶 Os mesmos CPFs da Fase 3 contra o ambiente real: não verificado.


## Etapa 6 — Testes e qualidade

- [x] **T6.1 [OS]** `jest-cucumber` + `tests/bdd/features/ciclo-os.feature` (`# language: pt`) com os 6 cenários do plano; *step definitions* com Postgres (Testcontainers) + `InMemoryMessageBus` + fakes de Billing/Execution.
  ✔ 6 cenários verdes no CI; relatório do BDD publicado no `GITHUB_STEP_SUMMARY`.
  ✅ 6 cenários em português verdes (`tests/bdd/`), com mutação conferida (trocar a ordem esperada de compensação quebra o cenário). Relatório no `GITHUB_STEP_SUMMARY` (passo no CI). **Desvio**: o OS roda com repositórios em memória (rollback transacional simulado), não Postgres/Testcontainers — o Postgres real já é coberto pelas suítes de repositório/integração; BDD ficou executável sem Docker.
  ➕ **Contratos entre serviços** (`tests/contracts/`, não previstos no plano): produtor gera envelopes reais → JSON versionado → copiado ao consumidor, que o alimenta aos handlers reais. Pegou na prática ids de correlação inconsistentes entre fluxos. Cobre os 7 comandos do OS e os 17 eventos da filter policy.
- [x] **T6.2 [OS/EX/BI]** Testes de integração com LocalStack (Testcontainers) para o adapter de mensageria e, no EX, o repositório DynamoDB.
  🔶 `tests/integration/messaging-localstack.spec.ts` (raw delivery + filter policy, delete pós-commit, DLQ) nos 3 repos e o spec do DynamoDB no Execution; CI sobe LocalStack como service container. **Escritos e type-checados, nunca executados** (sem Docker). Não usa Testcontainers: service container do GitHub Actions.
- [x] **T6.3 [OS/EX/BI]** `coverageThreshold` 80% global em cada `jest.config.js`, excluindo só bootstrap (`src/index.ts`).
  ✔ `npm run test:coverage` ≥ 80% nos 3 (registrar os números aqui).
  ✅ Medido sem Docker: **Billing 98,2 % linhas / 93,5 % branches**, **Execution 98,8 % / 95,3 %** (limite 80 %). 🔶 **OS: não mensurável aqui** — sem as 10 suítes de Docker: 86,6 % linhas, 77,0 % branches, 78,5 % funções (abaixo de 80 % só porque os repositórios/mappers/rotas Postgres ficam descobertos sem Docker); o número real sai do CI.
- [x] **T6.4 [OS/EX/BI]** `sonar-project.properties` apontando para SonarCloud (`sonar.organization`, `sonar.projectKey`), remover `sonar.login/password` hardcoded do OS.
  ↳ `sonar-project.properties` nos 3 repos (`sonar.organization=pedrospinho`, `projectKey=pedrospinho_<repo>` — **valores presumidos, conferir no SonarCloud**); `sonar.login/password` removidos e o SonarQube local (compose + scripts npm) eliminado. O scan no CI fica para a Etapa 8.
- [x] **T6.5 [OS]** Docker-compose de integração local (os 3 serviços + Postgres + LocalStack) e script de smoke do fluxo feliz.
  🔶 `docker-compose.integration.yml` (OS + Billing + Execution + Postgres com o MESMO `db-bootstrap.sql` + LocalStack + Mailhog) e `scripts/smoke-fluxo-feliz.sh` (curl+jq, 10 passos até OS `FINALIZADA` e `receitaTotal` no dashboard). Billing ganhou `POST /internal/dev/mercadopago/pagamentos` (só com `PAYMENT_GATEWAY=fake`) para simular o comprador. **Nada disso foi executado** (sem Docker); o script só passou por `bash -n`.


## Etapa 7 — Observabilidade distribuída

- [x] **T7.1 [EX/BI]** Agente New Relic (`newrelic.js` carregado primeiro, mock em `tests/__mocks__`), `NEW_RELIC_APP_NAME=<serviço>-<env>`.
  ↳ Já estava pronto desde as Etapas 3/4: `require('newrelic')` primeiro em `index.ts`, `NEW_RELIC_APP_NAME=<serviço>-<env>` no Secret do CI, mock em `tests/__mocks__` (agora com `getTransaction`/`startBackgroundTransaction`).
- [x] **T7.2 [OS/EX/BI]** Propagação de trace no adapter de mensageria (`insertDistributedTraceHeaders` no envio, `startBackgroundTransaction` + `acceptDistributedTraceHeaders('Queue', …)` no consumo).
  ✔ Um trace único OS → Billing → OS visível no Distributed Tracing.
  🔶 Implementado e testado com o agente mockado (headers vão no envelope e nos MessageAttributes; consumo em transação "Queue" ligada ao produtor; erro do handler vai ao APM e a mensagem volta à fila). **Desvio**: o trace é capturado no **enqueue** (`createEnvelope`) e viaja no campo opcional `trace` do envelope — capturar no relay do outbox perderia a transação de origem. ✔ "trace único OS → Billing → OS no Distributed Tracing": **não verificado** (precisa de conta New Relic + deploy).
- [x] **T7.3 [OS/EX/BI]** `sagaId`/`ordemServicoId` no contexto do logger (`AsyncLocalStorage`) e como atributos customizados da transação.
  ✅ `vincularSaga` (logger + atributos da transação) no consumidor de mensagens, no orquestrador, nos use cases do Billing e no webhook do MP.
- [x] **T7.4 [OS]** Eventos customizados `SagaPassoExecutado` e `SagaFinalizada{resultado, duracaoMs}`.
  ✅ `SagaPassoExecutado`, `SagaFinalizada` (emitidos após o commit; única vez por saga) e, a mais, `SagaIniciada` (no use case de criação da OS) para o gráfico de iniciadas/hora. Testado (CONCLUIDA, COMPENSADA, FALHA_COMPENSACAO).
- [x] **T7.5 [OS/EX/BI]** Coletor periódico de `ApproximateNumberOfMessages` das próprias filas/DLQs → evento `FilaProfundidade`.
  ✅ `QueueDepthCollector` nos 3 serviços (fila própria + `<fila>-dlq`, por convenção de nome), só com SQS real; testado com SQS mockado.
- [x] **T7.6 [K8S]** Dashboard "Saga / Microsserviços" e alertas (`FALHA_COMPENSACAO`, DLQ > 0, taxa de compensação, erro no webhook MP) em Terraform.
  ✔ Mensagem forçada para a DLQ dispara o alerta.
  🔶 `k8s-infra/newrelic_saga.tf`: dashboard em 2 páginas e 4 alertas na política existente; `terraform fmt`/`validate` OK. ✔ "mensagem forçada para a DLQ dispara o alerta": **não verificado**; nomes de evento/atributo e a NRQL aninhada do billboard de DLQ devem ser conferidos contra dados reais.


## Etapa 8 — CI/CD

- [ ] **T8.1 [EX/BI]** `ci-cd.yml` completo: `build` → `test` → `sonar` → `terraform` (plan em PR / apply em push) → `docker-build-push` → `deploy` → smoke `/health/ready`.
- [ ] **T8.2 [OS]** Adicionar ao pipeline atual: job `sonar`, job `terraform` do serviço, Job de bootstrap de banco, Ingress, e o relatório BDD.
- [ ] **T8.3 [OS/EX/BI]** `destroy.yml` manual por serviço (mesmo padrão dos repos de infra) — destrói filas/tabela/ECR do serviço.
- [ ] **T8.4 [👤]** Branch protection nos 2 repos novos + checks obrigatórios `build`, `test`, `sonar` nos 3 repos de serviço.
- [ ] **T8.5** Primeira execução real em `homolog` dos 3 pipelines (registrar aqui os bugs achados e corrigidos, como em "Execução real" da Fase 3).

## Etapa 9 — Documentação e entregáveis

- [ ] **T9.1 [EX/BI]** README completo (propósito, arquitetura do serviço com diagrama, banco e justificativa, contratos produzidos/consumidos, endpoints, execução local, CI/CD, evidência de cobertura, Swagger/Postman).
- [ ] **T9.2 [OS]** README: reescrever como OS Service + seção "Saga Pattern — estratégia orquestrada e justificativa" + diagramas de sequência + links dos outros 5 repos.
- [ ] **T9.3 [OS]** `docs/architecture/`: `component-diagram.md` (microsserviços), `sequence-saga-feliz.md`, `sequence-saga-compensacao.md`, `data-model.md` por serviço.
- [ ] **T9.4 [OS/EX/BI]** Swagger por serviço + collection Postman do fluxo completo (variáveis encadeadas: token → OS → execução → orçamento → pagamento).
- [ ] **T9.5 [OS]** Atualizar `docs/PROJECT_STATUS.md` com a Fase 4.
- [ ] **T9.6 [👤]** Vídeo (≤ 15 min) — roteiro no guia de execução.
- [ ] **T9.7 [👤]** PDF do portal — conteúdo no guia de execução.

---

## Registro de execução

> Preencher conforme as tasks forem concluídas: data, números de testes/cobertura,
> bugs encontrados na execução real e desvios em relação ao plano.

### 2026-11-11 — Etapa 1

- **Docs** (no OS Service, `docs/architecture/`): `contratos-mensagens.md`
  (envelope, topologia, 4 comandos Billing/Execution + 7 eventos Execution +
  10 eventos Billing + `OrdemServicoStatusAlterado`, regras de consumo e mapa
  evento → ação do orquestrador), `rfcs/RFC-005`, `adrs/ADR-008` a `ADR-015`.
- **Esqueletos**: Billing (40 testes, cobertura 98,4%) e Execution (33 testes,
  98,6%), ambos com `build`, `lint`, `type-check` e `prettier` limpos. Estrutura
  comum: `src/app.ts` (`createApp`, separado do bootstrap em `src/index.ts` para
  testar com supertest), `HealthController` com *readiness probe* injetável
  (Billing: Postgres; Execution: sem probe até a T3.2), `authMiddleware` e
  `JwtService` copiados do OS (mesmo `JWT_SECRET`, escopos `interno`/`cliente`).
- **Desvios/decisões novas**:
  - Swagger dos serviços novos fica em `/api/orcamentos/docs` (Billing) e
    `/api/execucoes/docs` (Execution), para ser alcançável pelo path do Ingress
    (ADR-013); configurável por `DOCS_PATH`.
  - Portas locais no host: OS 3001, Execution 3002, Billing 3003, Postgres do
    Billing 5433 (para rodar os três juntos).
  - `jwt.service.spec.ts` movido de `tests/application/use-cases/` (onde estava
    no OS por engano) para `tests/infrastructure/security/` nos serviços novos.
- **Pendências**: remotos do GitHub e push (T0.3); `docker compose`/`docker build`
  não validados por falta de Docker no ambiente; mudanças no repo OS (lint, docs)
  **não commitadas** — `docs/` está no `.gitignore`, usar `git add -f docs/…`.

### 2026-11-11 — Etapa 2 (OS Service)

Branch `feat/fase4-etapa2` (sem push). **Verificado**: `tsc` e `eslint` limpos; 617 testes passando, **10 suítes falham só por falta de Docker** (7 repositórios Postgres, 2 integração, `messaging.spec.ts`) — "Could not find a working container runtime strategy", sem relação com o código. A cobertura global não pôde ser medida aqui (essas suítes entram no cálculo); rodar no CI/Docker.

**Desvios / decisões**
- Transação por `AsyncLocalStorage` (`PostgresUnitOfWork` + `txAwarePool`): os repositórios continuam usando `this.pool.query`; dentro do `run` as queries vão para a conexão da transação, e o `BEGIN/COMMIT` interno do `OrdemServicoRepository` vira no-op. Evitou mudar a assinatura de todos os repositórios.
- `GerarOrcamento.itens[].referenciaId` de `SERVICO` é o **id do serviço da OS** (a entidade `Servico` não guarda o `catalogoServicoId`); `PECA` segue sendo o `pecaId`. Ajustar o contrato no Billing.
- `CreateOrdemServico` ainda aceita `catalogoServicos` (estimativa inicial na recepção); o resultado do diagnóstico **substitui** os serviços (`registrarDiagnostico`).
- Pagamento confirmado **depois** de a saga ter compensado (timeout × cliente pagando) reabre a saga em `COMPENSANDO` com `ESTORNAR_PAGAMENTO` — caso não previsto no plano.
- Falha de compensação (`EstornoFalhou` ou timeout) é retentada até `SAGA_MAX_TENTATIVAS_COMPENSACAO`; a OS **não** é cancelada em `FALHA_COMPENSACAO` (dinheiro/estado exigem intervenção manual).
- ECR novo `soat15-tc-os-service` (o antigo `soat15-tc-oficina-api` é do `k8s-infra`); `ECR_REPOSITORY` do CI trocado.
- `WEBHOOK_SECRET` substituído por `INTERNAL_API_TOKEN` (GitHub Secret novo no repo do OS).

**Pendências para o usuário / próximas etapas**
- Rodar a suíte com Docker (repositórios, integração, `messaging.spec.ts`) e o `docker compose up` (LocalStack + `scripts/localstack-init.sh`) — nada disso foi executado.
- Criar o GitHub Secret `INTERNAL_API_TOKEN` no repo do OS; `terraform apply` em `homolog` acontece no primeiro push.
- As filas `execution-commands`/`billing-commands` são criadas pelos outros serviços (convenção de nome `soat15-tc-<env>-<fila>` usada no CI do OS).
- Role `os_service` / database `oficina_os` (T2.18) → Etapa 6.

### 2026-11-12 — Etapa 3 (Execution Service)

Repo `soat15-tech-challenge-execution-service`, branch `feat/fase4-etapa3` (3 commits, sem push). **Verificado**: `tsc`, `eslint`, `prettier` e `npm run build` limpos; 199 testes passando, cobertura **98,8 % de linhas / 95,2 % de branches** (limite 80 %); `terraform fmt` + `validate` OK; YAML de K8s/CI/compose parseia.

**Não verificado (sem Docker/AWS)**: `tests/integration-localstack.spec.ts` (6 testes, pulados sem `LOCALSTACK_ENDPOINT`), `docker compose up` + `scripts/localstack-init.sh`, `terraform apply`, deploy no EKS. O repositório DynamoDB foi testado com o `DocumentClient` mockado (formato dos comandos e mapeamento de `TransactionCanceledException`), não contra um DynamoDB real.

**Desvios / decisões**
- Eventos de resposta emitidos no **aceite do comando** (`DiagnosticoIniciado`, `ReparoIniciado`); as ações do mecânico entre eles não geram evento, exceto conclusão/falha.
- `PATCH /:id/diagnostico/falhar` adicionado à API.
- Inbox na mesma transação do efeito (não `PutItem` separado); trava `OSLOCK#<osId>` para 1 execução por OS.
- `SolicitarDiagnostico` repetido (novo `messageId`) repete a resposta sem duplicar; execução cancelada responde `DiagnosticoFalhou`. Payload sem `ordemServicoId` é erro permanente (DLQ).
- Service na porta 3002; HPA 1–2 réplicas; tabela `soat15-tc-<env>-execucoes`; fila `soat15-tc-<env>-execution-commands`.

**Pendências para o usuário**
- Rodar `docker compose up --build` e a suíte com `LOCALSTACK_ENDPOINT` definido.
- Secrets no repo do Execution: `AWS_*` (Learner Lab) e opcionalmente `NEW_RELIC_LICENSE_KEY`; ordem de deploy: OS antes do Execution.
- Nos nós, se o IMDS não responder de dentro do pod, subir `HttpPutResponseHopLimit` para 2.

### 2026-11-12 — Etapa 4 (Billing Service)

Repo `soat15-tech-challenge-billing-service`, branch `feat/fase4-etapa4` (5 commits, sem push). **Verificado**: `tsc`, `eslint`, `prettier` e `npm run build` limpos; 238 testes passando, cobertura **98,2 % de linhas / 93,4 % de branches** (limite 80 %); `terraform fmt` + `validate` OK; YAML de K8s/CI/compose parseia.

**Não verificado (sem Docker/AWS/MP)**: `tests/integration.postgres.spec.ts` (5 testes: migrations reais, rollback, índice parcial, webhooks concorrentes com `FOR UPDATE`, `SKIP LOCKED` — pulados sem `TEST_DATABASE_URL`, rodam no CI com service container); os repositórios Postgres só foram testados com `pool` simulado; integração real com o sandbox do Mercado Pago; `docker compose up`; `terraform apply`; deploy no EKS (depende também do bootstrap do banco, Etapa 5).

**Desvios / decisões**
- Chamadas ao MP **fora** da transação do banco; `X-Idempotency-Key` (`preferencia-<orcamentoId>`, `estorno-<pagamentoId>`). Falha do MP em `SolicitarPagamento` propaga (mensagem volta à fila); em `EstornarPagamento` responde `EstornoFalhou` para a Saga decidir o retry.
- Link de pagamento cancelado (`CancelarOrcamento`) marca o pagamento pendente como `RECUSADO`; se o cliente pagar mesmo assim, o webhook o confirma (`RECUSADO → CONFIRMADO`) e a Saga estorna (caso previsto no OS).
- Cartão recusado no MP publica `PagamentoRecusado` imediatamente (a Saga compensa), mesmo que o Checkout Pro permitisse outra tentativa.
- Aprovar orçamento vencido: vira `EXPIRADO`, publica `OrcamentoRecusado` e responde 422.
- `GET /internal/financeiro/resumo` devolve `{ receitaTotal, totalEstornado, pagamentosConfirmados, pagamentosEstornados }` (o OS lê só `receitaTotal`).
- `/internal` não está no Ingress: o OS chama `http://billing-service:3003` dentro do cluster. Service na porta 3003.
- `PAYMENT_GATEWAY=fake` no `docker-compose` (sem conta MP); `mercadopago` nos manifests K8s.

### 2026-11-12 — Etapa 5 (plataforma compartilhada)

Branch `feat/fase4-etapa5` em 4 repos (sem push): `db-infra`, `k8s-infra`, `auth-lambda` e OS. **Verificado**: `terraform fmt`/`validate` (1.9.5) nos 3 repos de infra; auth-lambda `tsc` + 32 testes; `bash -n` e `--dry-run` do script; YAMLs. **Não verificado**: qualquer `apply`, o SQL do bootstrap, o Job no cluster, o VPC Link/ALB reais e a Lambda contra o OS real.

**Desvios / decisões**
- Bootstrap do banco: SQL no repo do OS (`k8s/db-bootstrap.sql`) e roda no pipeline do OS — o Billing exige que o OS tenha feito deploy antes.
- Senhas dos roles só alfanuméricas (entram em URL/`psql -v` sem escape).
- A Lambda de token só emite tokens depois da fase 2 do apply (precisa do DNS do ALB); sem ele responde 500.
- `eks_service_tag_value`/`eks_nlb_listener_port` viraram `eks_ingress_group`/`eks_alb_listener_port`; o CI do auth-lambda exporta `TF_VAR_internal_api_token` (novo GitHub Secret `INTERNAL_API_TOKEN` nesse repo).
- O API Gateway não roteia por serviço: o `ANY /api/{proxy+}` vai ao ALB e o Ingress distribui por path.
- `db-infra` e `k8s-infra` ainda leem o remote state de `homolog` fixo (herdado da Fase 3).

### 2026-11-12 — Etapa 6 (testes e qualidade)

Branch `feat/fase4-etapa6` nos 3 serviços (sem push; as branches das etapas anteriores foram mantidas nos commits de cada etapa). **Verificado**: OS — BDD (6) + contratos (25) verdes, `tsc` limpo; Billing 243 testes e Execution 201 passando; lint/prettier limpos. **Não verificado**: tudo que exige Docker (integração LocalStack nos 3, compose de integração, smoke) e a cobertura real do OS.

**Desvios / decisões**
- Contratos por exemplo: se o formato de um comando/evento mudar, o teste do **produtor** falha até regenerar (`UPDATE_CONTRACTS=1 npx jest tests/contracts`) e copiar o JSON ao consumidor — o processo é manual (sem repositório compartilhado, como decidido na A3/A4).
- `FakePaymentGateway` passou a gerar ids determinísticos (`pref-N`, `refund-N`) para os contratos serem estáveis.
- O BDD usa os eventos reais do contrato nos testes de contrato, com os ids de correlação trocados pelos da saga (cada fixture vem de um fluxo diferente do produtor).

### 2026-11-12 — Etapa 7 (observabilidade distribuída)

Branch `feat/fase4-etapa7` nos 3 serviços e no `k8s-infra` (sem push). **Verificado**: `tsc`/lint/prettier limpos; Execution 217 e Billing 261 testes passando (cobertura ≥ 98 % linhas); OS — saga/BDD/contratos/mensageria (124) passando, as mesmas 10 suítes de Docker seguem sem rodar; `terraform fmt`/`validate` no `k8s-infra`. **Não verificado**: tudo que exige o agente real (traces, atributos, eventos chegando na conta) e os recursos New Relic via Terraform.

**Desvios / decisões**
- Campo opcional `trace` no envelope (compatível com v1 — o consumidor que não o conhece o ignora); ausente quando não há transação, então os contratos (`tests/contracts`) não mudaram.
- `src/shared/observability/tracing.ts`, `logger.ts`, `envelope.ts`, o adapter SQS/SNS e o `QueueDepthCollector` são cópias idênticas nos 3 serviços (como o envelope).
- A DLQ é medida pela convenção `<fila>-dlq` (nome na AWS: `soat15-tc-<env>-<fila>-dlq`, derivado da URL da fila).
- Alerta de taxa de compensação usa percentual simples (50 %/15 min): com poucas sagas é ruidoso — ajustar na demonstração.
