# Status do Projeto — Auto Repair Shop Management System

**Última Atualização**: 2026-09-09
**Testes**: 532 unitários/aplicação/apresentação + 65 de integração PostgreSQL + 9 de integração E2E (Testcontainers) | **Cobertura**: Statements 97,7% | Branches 95,1% | Functions 93,5% | Lines 98,1%
**Status atual**: Fase 1 e Fase 2 completas (histórico abaixo) → **Fase 3 (Cloud, Serverless e Observabilidade) com os 4 pipelines executados e verdes em `homolog`** — `db-infra`, `k8s-infra`, app principal (deploy no EKS) e `auth-lambda` (fases 1 e 2, VPC Link incluso) aplicados com sucesso contra a AWS real; `db:seed` implementado e os dois fluxos de autenticação (cliente por CPF e login interno e-mail/senha) validados ponta a ponta via `curl` contra o endpoint público do API Gateway; Observabilidade com APM + `nri-bundle` confirmados conectando de verdade ao New Relic, e os 4 dashboards + 6 alertas NRQL escritos como Terraform, à espera das credenciais novas (User API Key + Account ID) para aplicar

---

## 🧭 Tech Challenge — Fase 3 (Cloud, Serverless e Observabilidade)

Planejamento completo em [`docs/PHASE_3_PLAN.md`](PHASE_3_PLAN.md) (baseado em
`docs/13SOAT - Fase 3 - Tech Challenge.pdf`). Resumo do escopo: autenticação via
CPF com Function Serverless + API Gateway, segregação em 4 repositórios com
CI/CD e deploy automático em nuvem (Lambda, infra K8s via Terraform, infra de
banco gerenciado via Terraform, aplicação no Kubernetes), observabilidade com
New Relic (dashboards, alertas, logs estruturados com correlação) e documentação
arquitetural (RFCs, ADRs, diagramas de componentes/sequência/ER).

**Status**: os 4 pipelines já rodaram de verdade contra a AWS real (Learner
Lab) em `homolog` e terminaram verdes — `db-infra` (VPC + RDS), `k8s-infra`
(EKS + node group + AWS LB Controller + metrics-server), app principal
(build/test/push ECR/deploy no EKS, migrations rodadas) e `auth-lambda`
(fase 1: Lambdas + SSM `jwt-secret`; fase 2: VPC Link ligado ao NLB do app).
Cadeia de autenticação de cliente (CPF) e de login interno (e-mail/senha)
validadas ponta a ponta via `curl` direto no endpoint público do API
Gateway, com `db:seed` já implementado e rodando no pipeline (ver
"`db:seed` implementado..." em [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md)). O
achado de que `POST /api/auth/login` era inalcançável pelo endpoint público
(só `POST /auth/token` era rota pública) foi corrigido com uma rota exata
sem autorizador em `auth-lambda/terraform/api_gateway.tf` — ver "Achado
corrigido" em [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md).

| Item | Status |
|---|---|
| Documentação arquitetural (`docs/architecture/`: componentes, sequências, ER, 4 RFCs, 6 ADRs) | ✅ Concluída |
| Guia de execução para as etapas que dependem de conta ([`PHASE_3_EXECUTION_GUIDE.md`](PHASE_3_EXECUTION_GUIDE.md)) | ✅ Concluído |
| Etapa 0 — Learner Lab validado, 4 repositórios GitHub criados (`main`+`homolog`), bootstrap do estado Terraform (S3 + DynamoDB lock), `soat-architecture` como colaborador | ✅ Concluída |
| Etapa 1 — camada PostgreSQL para todos os agregados, incluindo `OrdemServico`/`Servico`/`Pagamento` (árvore transacional de 3 níveis) — ver [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md) | ✅ Concluída |
| Etapa 4 — fábrica trocada para Postgres, Mongo removido, logs `pino`+correlationId, `SesNotificationService` por env var, healthchecks `/live`+`/ready`, `docker-compose` com `postgres:16`, collection Postman — ver [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md) | ✅ Concluída |
| Etapa 2.3 — `authMiddleware` com token interno + token de cliente por CPF, `requireInternalScope` nas rotas de gestão, `/buscar` fechado por CPF próprio — ver [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md) | ✅ Concluída |
| Etapa 7 — CI/CD nos 4 repositórios executado de verdade em `homolog`, todos verdes — ver "Execução real" em [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md) para a lista de bugs achados/corrigidos no processo | ✅ **Execução real confirmada** (2026-09-08) |
| `db:seed` (usuário admin + cliente de teste) + fluxo de cliente (CPF→JWT→`/buscar`) validado via `curl` contra a AWS real — ver [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md) | ✅ Concluído (2026-09-08) |
| Login interno (`POST /api/auth/login`) exposto publicamente no API Gateway (rota exata sem autorizador, mesma integração HTTP_PROXY/VPC Link) — validado via `curl`: login→JWT `interno`, esse token em `GET /api/clientes`→`200`, senha errada→`401` | ✅ Concluído (2026-09-08) |
| Terraform `soat15-tech-challenge-db-infra` (VPC, RDS PostgreSQL 16, SSM Parameter Store, security groups) | ✅ `terraform apply` confirmado em `homolog` (RDS `available`) |
| Terraform `soat15-tech-challenge-k8s-infra` (EKS + node group, addons incl. `metrics-server`, AWS LB Controller, ECR) | ✅ `terraform apply` confirmado — cluster `ACTIVE`, node group com `ami_type=AL2023` e `metadata_options` (hop limit 2, exigido pelo LB Controller sem IRSA) |
| `soat15-tech-challenge-auth-lambda` (Lambda de token + Lambda Authorizer + API Gateway HTTP API) | ✅ Fases 1 e 2 aplicadas — VPC Link ligado ao NLB interno do EKS (`service.k8s.aws/stack`, porta 3001) |
| Proteção de branches + `soat-architecture` como colaborador nos 4 repos | ⏳ Precisa confirmação explícita (não verificado nesta sessão) |
| Observabilidade (New Relic: APM na app + `nri-bundle` no cluster) — ver "Etapa 5" em [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md) | ✅ Confirmado conectando de verdade (2026-09-09) — logs do agente mostram `Reporting to: https://one.newrelic.com/...` |
| `k8s-infra` travado (`system:anonymous` em qualquer apply) — causa raiz era só `cluster_version` desatualizado (1.30 vs. 1.31 real); corrigido, `terraform apply` voltou a rodar limpo | ✅ Resolvido (2026-09-08) — ver "Achado e correção" em [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md) para o quase-incidente (tentativa de `access_config` chegou a iniciar um `Destroying` real do cluster, revertida a tempo) |
| Instrumentação das Lambdas (`auth-lambda`) via layer New Relic | ❌ Não implementada — Lambdas sem NAT Gateway (sem saída à internet) + Learner Lab bloqueia IAM role própria para a integração CloudWatch nativa; achado documentado em [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md) |
| Dashboards (4 exigidos) e alertas NRQL (6 exigidos) | 🟡 Escritos como Terraform (`newrelic_dashboards.tf`/`newrelic_alerts.tf` em `k8s-infra`, gated por `var.enable_new_relic_dashboards`) — falta criar o User API Key + pegar o Account ID, configurar os secrets novos e aplicar; ver "Etapa 5 — Dashboards e alertas" em [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md) |
| 2 nós órfãos `NotReady` no cluster (instâncias já substituídas, nunca removidas do Kubernetes) — cosmético, node group `ACTIVE`, app respondendo normalmente | ⏳ Pendente limpeza (`kubectl delete node`), precisa de acesso `kubectl` real (não funciona neste sandbox) |

**Próxima tarefa recomendada**: Observabilidade tem o APM e o `nri-bundle`
confirmados funcionando, e os 4 dashboards + 6 alertas já escritos como
Terraform em `k8s-infra`. Falta: (1) criar um User API Key na conta New
Relic (Perfil → API keys) e pegar o Account ID; (2) configurar
`NEW_RELIC_API_KEY`/`NEW_RELIC_ACCOUNT_ID` (e opcionalmente
`ALERT_NOTIFICATION_EMAIL`) como GitHub Secrets em `k8s-infra`; (3) rodar o
pipeline e confirmar na UI que os 4 painéis populam; (4) provocar um erro de
propósito para validar pelo menos um alerta disparando (item da seção
"Verificação" do `PHASE_3_PLAN.md`). Itens administrativos pendentes:
confirmar proteção de branches e colaborador `soat-architecture` nos 4
repos; considerar merge de `homolog` para `main` (ambiente `prod`) quando o
time decidir promover.

---

## 🚀 Tech Challenge — Fase 2 (Evolução para Produção)

> Não confundir com "Fase 2: Peças & Estoque" listada em **Fases Concluídas** abaixo —
> aquela é uma sub-fase interna do desenvolvimento da Fase 1 do curso. Esta seção
> trata da **Fase 2 do Tech Challenge** (o segundo módulo/entrega do curso).

Planejamento completo em [`docs/PHASE_2_PLAN.md`](PHASE_2_PLAN.md); checklist
detalhado, item a item, em [`docs/PHASE_2_TASKS.md`](PHASE_2_TASKS.md). Resumo:

| Etapa | Status | Destaques |
|---|---|---|
| 1. Evolução da aplicação | ✅ Concluída | Composition root (`src/main/`), port `INotificationService` + `NodemailerNotificationService`, webhook de aprovação de orçamento (`POST /:id/orcamento/webhook`), listagem de OS reordenada por status com `FINALIZADA`/`ENTREGUE` ocultas por padrão, e-mail automático a cada transição de status, testes de integração reais com MongoDB (`mongodb-memory-server`) e E2E via HTTP |
| 2. Containerização | ✅ Concluída | `Dockerfile` validado pós-refactor; `docker-compose.yml` com serviço `mailhog` e novas env vars (SMTP, `WEBHOOK_SECRET`) |
| 3. Kubernetes (`k8s/`) | ✅ Concluída* | Namespace, Deployment (2 réplicas), Service, ConfigMap, Secret (template), HPA (`autoscaling/v2`), MongoDB (StatefulSet + PVC), Mailhog |
| 4. Terraform (`infra/`) | ✅ Concluída* | Provisiona cluster `kind` local + aplica os manifestos de `k8s/` via `null_resource`/`local-exec` (decisão documentada em `infra/README.md`) |
| 5. CI/CD (GitHub Actions) | ✅ Concluída* | `.github/workflows/ci-cd.yml`: build → test (Mongo real) → docker-build (push GHCR) → deploy (kind efêmero no runner + smoke test) |
| 6. Documentação e entregáveis | 🔄 Em progresso | README.md reescrito (endpoints, arquitetura, diagrama Mermaid, CI/CD, K8s/Terraform), Swagger completo, este arquivo atualizado — vídeo e PDF de entrega são passos manuais do aluno, fora do escopo de código |

\* Validado estaticamente (build, `terraform validate`/`plan`, `actionlint`) — não
executado contra um cluster/pipeline real neste ambiente de desenvolvimento (sem
`kubectl`/`kind`/execução real do GitHub Actions disponíveis). Ver detalhes e
instruções de validação local em `k8s/README.md`, `infra/README.md` e no próprio
workflow.

**Decisões de infraestrutura**: cluster `kind` local (sem custo de cloud), e-mail via
Nodemailer + Mailhog, refactor arquitetural "reforço leve" (mantém a estrutura DDD em
camadas já existente), CI/CD via GitHub Actions.

**Achados durante a Fase 2** (pré-existentes, não introduzidos por ela — ver
"Notas e limitações conhecidas" no `README.md` para detalhes): `npm run
db:seed`/`db:reset` referenciam arquivos que ainda não existem (não há seed de
usuário/dados); `npm run lint` está quebrado por incompatibilidade `eslint@10` vs.
`.eslintrc.json` legado. Dois achados foram corrigidos nesta fase:
`npm run test:unit`/`test:integration` usavam a flag `--testPathPattern`, removida
nas versões atuais do Jest — atualizado para `--testPathPatterns`; e `authMiddleware`
não bloqueava requisições sem header `Authorization` (havia uma linha comentada com o
comportamento correto, desativada durante a Fase 1 e nunca revertida) — corrigido para
rejeitar com 401, com os testes de unidade e o E2E de OS atualizados de acordo.

---

## ✅ Fases Concluídas (Tech Challenge — Fase 1)

### Fase 0: Project Bootstrap — COMPLETA

| Task | Descrição | Status |
|------|-----------|--------|
| 0.1 | Estrutura de pastas, package.json, tsconfig, ESLint, Jest | ✅ |
| 0.2 | MongoDB connection com retry e graceful shutdown | ✅ |
| 0.3 | Dockerfile, docker-compose.yml, health check endpoint | ✅ |
| 0.4 | JWT service, hash service, auth middleware, login endpoint | ✅ |

---

### Fase 1: Cliente & Veículo — COMPLETA

#### Task 1.1 — Cliente entity + value objects
- `src/domain/entities/cliente.entity.ts` — imutável, factory `Cliente.create()`
- `src/domain/value-objects/cpf-cnpj.vo.ts` — validação de dígitos verificadores
- `src/domain/value-objects/endereco.vo.ts`
- `src/domain/repositories/cliente.repository.ts` — interface `IClienteRepository`
- `src/infrastructure/database/mongodb/schemas/cliente.schema.ts`
- `src/infrastructure/database/mongodb/repositories/cliente.repository.impl.ts`

#### Task 1.2 — Cliente use cases + REST API
- Use cases: `CreateCliente`, `GetCliente`, `UpdateCliente`, `ListClientes`, `DeactivateCliente`
- DTOs, mapper `ClienteMapper`
- `src/presentation/controllers/cliente.controller.ts`
- `src/presentation/routes/cliente.routes.ts` — todas as rotas protegidas com `authMiddleware`
- `src/presentation/validators/cliente.validator.ts`
- Rota registrada: `POST|GET|PUT|DELETE /api/clientes`

#### Task 1.3 — Veículo entity + value objects
- `src/domain/entities/veiculo.entity.ts` — `atualizarQuilometragem()` só aceita km crescente
- `src/domain/value-objects/placa.vo.ts` — formato antigo (`ABC-1234`) e Mercosul (`ABC1D23`)
- `src/domain/repositories/veiculo.repository.ts` — interface `IVeiculoRepository`
- Schema e repository MongoDB

#### Task 1.4 — Veículo use cases + REST API
- Use cases: `CreateVeiculo`, `GetVeiculo`, `UpdateVeiculo`, `ListVeiculosByCliente`
- Método `atualizar()` no entity (km + cor + observações em uma operação)
- `VeiculoResponseDto` inclui `placaFormatada`
- Rotas registradas: `GET|POST /api/veiculos` e `GET /api/clientes/:clienteId/veiculos`
- `veiculosByClienteRouter` usa `mergeParams: true`

---

### Fase 2: Peças & Estoque — COMPLETA

#### Task 2.1 — Peça entity + repository
- `src/domain/entities/peca.entity.ts`
  - Tipos: `CategoriaPeca` (MOTOR, TRANSMISSAO, SUSPENSAO, FREIOS, ELETRICA, FLUIDOS, FILTROS, OUTROS)
  - Tipos: `UnidadeMedida` (UNIDADE, LITRO, METRO, KG)
  - `get margemLucro()` — retorna 0 quando precoCompra é 0 (evita divisão por zero)
  - `atualizarPreco()`, `desativar()` — retornam nova instância (imutável)
  - Validações: código não vazio, descrição 5–200 chars, precoVenda ≥ precoCompra, nivelMaximo > nivelMinimo
- `src/domain/repositories/peca.repository.ts` — interface com `list(page, limit, filter?)`
- Schema com índice de texto (`descricao: 'text'`) e índice em `categoria`
- `MongoPecaRepository` com suporte a `$text: { $search }` no `list()`

#### Task 2.2 — Peça use cases + REST API
- Use cases: `CreatePeca`, `GetPeca`, `UpdatePeca`, `ListPecas`, `DeactivatePeca`
- `UpdatePecaUseCase` — atualiza preço e opcionalmente níveis (re-cria via `Peca.create()` para validação completa)
- `ListPecasUseCase` — sempre filtra `{ ativo: true }` por padrão, suporta `categoria` e `search`
- `PecaResponseDto` inclui `margemLucro` (formatado com 2 casas decimais)
- `src/presentation/validators/peca.validator.ts`
- Rota registrada: `GET|POST|PUT|DELETE /api/pecas`

#### Task 2.3 — Estoque (ItemEstoque + InventoryService)
- `src/domain/entities/item-estoque.entity.ts`
  - `reservar(qty)` — disponivel↓ reservada↑
  - `utilizar(qty)` — reservada↓ (estoque sai do sistema)
  - `liberarReserva(qty)` — reservada↓ disponivel↑
  - `abastecer(qty)` — disponivel↑
  - `get totalEmEstoque()`, `get isAbaixoDoMinimo()`
  - Totalmente imutável (todos os métodos retornam nova instância)
- `src/domain/repositories/item-estoque.repository.ts` — interface `IItemEstoqueRepository`
- `src/domain/services/inventory.service.ts` — `InventoryService` orquestra operações; cria novo item em `adicionarEstoque()` se não existir (exige thresholds)
- `MongoItemEstoqueRepository` — filtro `abaixoMinimo` aplicado na camada de aplicação

---

### Fase 3: Ordem de Serviço — COMPLETA

> **Nota (2026-07-07)**: o fluxo de status documentado nesta seção (`ABERTA →
> EM_ANDAMENTO → CONCLUIDA | CANCELADA`) é o que existia quando esta fase foi
> concluída. Ele evoluiu, em commits posteriores a esta entrega, para
> `RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA →
> ENTREGUE` (mais `CANCELADA`), que é o fluxo atual — ver a seção **Tech Challenge —
> Fase 2** no topo deste arquivo e a tabela de endpoints no `README.md`.

#### Task 3.1 — OrdemServico aggregate + NumeroOS VO ✅
- `src/domain/value-objects/numero-os.vo.ts`
  - `NumeroOS.generate(date, sequence)` → `OS-YYYYMMDD-####`
  - `NumeroOS.parse(value)` — valida formato via regex
- `src/domain/entities/ordem-servico.entity.ts`
  - Status: `ABERTA → EM_ANDAMENTO → CONCLUIDA | CANCELADA`
  - `iniciar()` — seta `dataInicio`
  - `concluir()` — seta `dataConclusao`
  - `cancelar(motivo)` — bloqueia se `CONCLUIDA` ou `temPagamento === true`
  - `registrarPagamento()` — disponível em `EM_ANDAMENTO` ou `CONCLUIDA`
- `src/domain/repositories/ordem-servico.repository.ts` — interface com `nextSequence(dateKey)` para geração atômica de número sequencial por dia
- `OSCounterModel` — documento MongoDB com `$inc` atômico para sequência diária
- Schema com índices em `clienteId`, `veiculoId`, `status`

#### Task 3.2 — Servico entity ✅
- `src/domain/entities/servico.entity.ts`
  - Status: `PENDENTE → EM_ANDAMENTO → CONCLUIDO | CANCELADO`
  - `iniciar()` — transição de PENDENTE para EM_ANDAMENTO
  - `concluir(tempoReal)` — seta `tempoRealMinutos`, transiciona para CONCLUIDO
  - `cancelar()` — bloqueia se CONCLUIDO ou já CANCELADO
  - `adicionarPeca(pecaId, quantidade, precoUnitario)` — bloqueia se CONCLUIDO/CANCELADO ou duplicado
  - `removerPeca(pecaId)` — bloqueia se CONCLUIDO/CANCELADO, lança `NotFoundError` se não existe
  - `get valorTotalPecas()` — soma de `quantidade * precoUnitario` por peça
  - `get valorTotal()` — `valorMaoDeObra + valorTotalPecas`
  - `PecaServico` interface: `{ pecaId, quantidade, precoUnitario }` (snapshot de preço)
  - Totalmente imutável (todos os métodos retornam nova instância)

#### Task 3.3 — CreateOrdemServico use case ✅
- Atualizado `OrdemServico` entity: campo `servicos: readonly Servico[]`, `adicionarServico()`, `get valorTotal()`
- `src/application/dtos/ordem-servico/ordem-servico.dto.ts` — `CreateOrdemServicoDto`, `CreateServicoDto`, `OrdemServicoResponseDto`, `ServicoResponseDto`
- `src/application/mappers/ordem-servico.mapper.ts` — `OrdemServicoMapper.toDto()`, `servicoToDto()`
- `src/application/use-cases/ordem-servico/create-ordem-servico.use-case.ts`
  - Valida existência do Cliente e Veículo
  - Valida que o Veículo pertence ao Cliente
  - Gera `NumeroOS` via `nextSequence(dateKey)` atômico
  - Cria Servicos iniciais opcionais (status `PENDENTE`)
  - Salva a OS com servicos embedded
- Schema MongoDB atualizado: subdocumento `servicos[]` com `pecasUtilizadas[]` embedded
- Repository impl atualizado: `toDomain`/`toPersistence` com reconstitução de `Servico` entities

#### Task 3.4 — OS lifecycle use cases ✅
- `IniciarOSUseCase` — ABERTA → EM_ANDAMENTO
- `ConcluirOSUseCase` — EM_ANDAMENTO → CONCLUIDA
- `CancelarOSUseCase` — ABERTA|EM_ANDAMENTO → CANCELADA (valida motivo, temPagamento)

#### Task 3.5 — OrdemServico REST API ✅
- `src/presentation/validators/ordem-servico.validator.ts` — `validateCreateOrdemServico`, `validateCancelarOS`
- `src/presentation/controllers/ordem-servico.controller.ts`
- `src/presentation/routes/ordem-servico.routes.ts`
  - `POST /api/ordens-servico` — cria OS
  - `GET /api/ordens-servico` — lista com filtros (status, clienteId, veiculoId, page, limit)
  - `GET /api/ordens-servico/:id` — busca por id
  - `PATCH /api/ordens-servico/:id/iniciar` — inicia OS
  - `PATCH /api/ordens-servico/:id/concluir` — conclui OS
  - `PATCH /api/ordens-servico/:id/cancelar` — cancela OS (body: `{ motivo }`)
- `GetOrdemServicoUseCase`, `ListOrdensServicoUseCase` implementados
- `ListOrdensServicoResponseDto` adicionado ao DTO

---

---

### Fase 4: Pagamento & Relatórios — COMPLETA

#### Task 4.1 — Pagamento entity + repository ✅
- `src/domain/entities/pagamento.entity.ts`
  - `FormaPagamento`: DINHEIRO | CARTAO_CREDITO | CARTAO_DEBITO | PIX | TRANSFERENCIA
  - `StatusPagamento`: PENDENTE | CONFIRMADO | CANCELADO
  - `confirmar()` — seta `dataPagamento`, transiciona para CONFIRMADO
  - `cancelar()` — bloqueia se já CONFIRMADO
  - Validações: `ordemServicoId` não vazio, `valor > 0`
- `src/domain/repositories/pagamento.repository.ts` — `sumConfirmados()` para receita total
- Schema MongoDB com índices em `ordemServicoId` e `status`
- `MongoPagamentoRepository` com `sumConfirmados()` via `$group` aggregate

#### Task 4.2 — Pagamento use cases + REST API ✅
- `CreatePagamentoUseCase` — valida OS (EM_ANDAMENTO|CONCLUIDA), cria já confirmado, chama `os.registrarPagamento()`
- `GetPagamentoUseCase`, `ListPagamentosUseCase`
- `PagamentoMapper`, `PagamentoResponseDto`, `CreatePagamentoDto`
- `POST /api/pagamentos` — registrar pagamento
- `GET /api/pagamentos` — listar (filtros: ordemServicoId, status, page, limit)
- `GET /api/pagamentos/:id` — buscar por id

#### Task 4.3 — Relatórios / Dashboard ✅
- `DashboardUseCase` — agrega dados de OS, pagamentos e estoque em paralelo (`Promise.all`)
- `GET /api/relatorios/dashboard` — retorna:
  - `ordensServico.{ total, abertas, emAndamento, concluidas, canceladas }`
  - `financeiro.{ receitaTotal }` (soma dos pagamentos CONFIRMADO)
  - `estoque.{ itensAbaixoDoMinimo }`

---

### Fase 5: CRUD de Serviços — COMPLETA

#### Task 5.1 — CatalogoServico entity ✅
- `src/domain/entities/catalogo-servico.entity.ts`
  - Campos: `id` (UUID), `descricao`, `preco`, `tempoEstimado`, `ativo`
  - `CatalogoServico.create()` — factory com validações
  - `editar(changes)` — retorna nova instância com campos atualizados (imutável)
  - `deletar()` — retorna nova instância com `ativo = false` (soft delete)
  - Validações: descrição não vazia, preço ≥ 0, tempoEstimado > 0

#### Task 5.2 — Repository + MongoDB ✅
- `src/domain/repositories/catalogo-servico.repository.ts` — `ICatalogoServicoRepository`
- `src/infrastructure/database/mongodb/schemas/catalogo-servico.schema.ts`
- `src/infrastructure/database/mongodb/repositories/catalogo-servico.repository.impl.ts`
  - `list()` com suporte a filtro `search` ($text) e `ativo`

#### Task 5.3 — Use cases CRUD ✅
- `CreateCatalogoServicoUseCase`, `GetCatalogoServicoUseCase`, `UpdateCatalogoServicoUseCase`
- `ListCatalogoServicoUseCase` (paginação, search), `DeleteCatalogoServicoUseCase` (soft delete)
- `CatalogoServicoMapper`, `CatalogoServicoResponseDto`

#### Task 5.4 — REST API ✅
- `POST /api/servicos` — criar serviço
- `GET /api/servicos` — listar (page, limit, search)
- `GET /api/servicos/:id` — buscar por id
- `PUT /api/servicos/:id` — editar
- `DELETE /api/servicos/:id` — deletar (soft delete)

#### Task 5.5 — OrdemServico atualizada ✅
- Novos campos: `catalogoServicoId?: string`, `precoServico?: number`
- `get valorTotal()` atualizado: `sum(servicos) + precoServico`
- Schema MongoDB, repository impl, DTOs e mapper atualizados
- `CreateOrdemServicoDto` aceita `catalogoServicoId` e `precoServico` opcionais

## ✅ Fase 6: Qualidade & Cobertura — COMPLETA

#### Cobertura ≥ 80% ✅
- Statements: 93.43% | Branches: 90.46% | Functions: 84.91% | Lines: 93.24%
- Thresholds configurados no `jest.config.js` (mínimo 80% em todas as métricas)
- Relatório LCOV gerado em `coverage/lcov.info` (integração com SonarQube)

#### SonarQube + SonarScanner ✅
- `docker-compose.yml` — serviço `sonarqube` (porta 9000, volumes persistentes, healthcheck)
- `docker-compose.yml` — serviço `sonar-scanner` com profile `sonar` (executa após SonarQube saudável)
- `sonar-project.properties` — configuração do projeto (sources, tests, lcov path, exclusions)
- Scripts npm:
  - `npm run sonar:up` — sobe SonarQube
  - `npm run sonar:scan` — roda cobertura + análise
  - `npm run sonar:down` — para SonarQube

## 📋 Pendente

### Fase 7: Documentação & Entrega
- [x] Swagger/OpenAPI completo *(concluído na Fase 2 — endpoint de webhook documentado)*
- [x] Atualização do README.md completo com instruções de uso e objetivos *(reescrito na Fase 2 — ver seção acima)*
- [ ] Video demonstração (10–15 min) — agora cobre também a Fase 2 (deploy, CI/CD, autoscaling)
- [ ] PDF entregável — idem

---

## 📊 Checklist de Progresso

### Infrastructure
- [x] package.json com dependências
- [x] tsconfig.json (strict, path aliases)
- [x] ESLint + Prettier
- [x] Jest + ts-jest
- [x] Dockerfile + docker-compose.yml
- [x] MongoDB connection
- [x] Health check endpoint
- [x] JWT auth infrastructure
- [x] Auth middleware
- [x] SonarQube e SonarScanner configurados e executando no docker


### Domain Layer
- [x] Cliente entity + CPF/CNPJ VO + Endereco VO
- [x] Veiculo entity + Placa VO
- [x] Peca entity (preço, margem, estoque)
- [x] CatalogoServico entity (preço, descrição, tempo estimado)
- [x] ItemEstoque entity (reservar/utilizar/liberar/abastecer)
- [x] OrdemServico aggregate + NumeroOS VO
- [x] Servico entity
- [x] Pagamento entity

### Application Layer
- [x] Cliente use cases (Create, Get, Update, List, Deactivate)
- [x] Veiculo use cases (Create, Get, Update, ListByCliente)
- [x] Peca use cases (Create, Get, Update, List, Deactivate)
- [x] CatalogoServico use cases (Create, Get, Update, List, Delete)
- [x] InventoryService (domain service)
- [x] OrdemServico use cases (Create, Get, List, Iniciar, Concluir, Cancelar)
- [x] Pagamento use cases (Create, Get, List)
- [x] Relatórios use cases (Dashboard)

### Presentation Layer
- [x] Auth endpoints (`POST /api/auth/login`)
- [x] Cliente REST API (`/api/clientes`)
- [x] Veiculo REST API (`/api/veiculos`, `/api/clientes/:id/veiculos`)
- [x] Peca REST API (`/api/pecas`)
- [x] Serviços REST API (`/api/servicos`)
- [x] OrdemServico REST API
- [x] Pagamento REST API
- [x] Relatórios REST API
- [x] Swagger/OpenAPI

### Testes
- [x] Unit — domain entities (Cliente, Veiculo, Peca, ItemEstoque, OrdemServico)
- [x] Unit — value objects (CpfCnpj, Endereco, Placa, NumeroOS)
- [x] Unit — use cases (cliente, veiculo, peca, inventory)
- [x] Unit — services (jwt, hash)
- [x] Integration — repositórios MongoDB *(concluído na Fase 2, `ordem-servico`; via `mongodb-memory-server`)*
- [x] E2E — fluxos completos *(concluído na Fase 2, ciclo de vida da OS + listagem, via `tests/integration/`)*
- [x] Cobertura ≥ 80%

### Quality & Security
- [x] TypeScript strict — type-check limpo
- [x] Rate limiting configurado
- [x] Security headers (Helmet)
- [x] CORS configurado
- [ ] ESLint sem warnings — *na verdade quebrado: `eslint@10` requer `eslint.config.js`, projeto ainda usa `.eslintrc.json` (achado da Fase 2, não corrigido — ver notas no README)*
- [x] SonarQube e SonarScanner configurados
- [x] npm audit limpo

### Entrega
- [ ] Repositório no GitHub
- [ ] Usuário `soatarchitecture` adicionado
- [ ] Vídeo de demonstração (10–15 min)
- [ ] PDF entregável
- [ ] Miro board finalizado

---

## 🗂️ Estrutura de Arquivos Atual

> Snapshot da Fase 1 (não inclui módulos adicionados depois, como
> `catalogo-servico`/`pagamento`/`relatorios` — ver `src/` no repositório para a
> árvore completa e atualizada). As adições da **Fase 2** estão listadas logo abaixo,
> separadamente.

```
src/
├── domain/
│   ├── entities/
│   │   ├── cliente.entity.ts
│   │   ├── veiculo.entity.ts
│   │   ├── peca.entity.ts
│   │   ├── item-estoque.entity.ts
│   │   ├── ordem-servico.entity.ts
│   │   ├── servico.entity.ts
│   │   └── user.entity.ts
│   ├── value-objects/
│   │   ├── cpf-cnpj.vo.ts
│   │   ├── endereco.vo.ts
│   │   ├── placa.vo.ts
│   │   └── numero-os.vo.ts
│   ├── repositories/
│   │   ├── cliente.repository.ts
│   │   ├── veiculo.repository.ts
│   │   ├── peca.repository.ts
│   │   ├── item-estoque.repository.ts
│   │   ├── ordem-servico.repository.ts
│   │   └── user.repository.ts
│   └── services/
│       └── inventory.service.ts
├── application/
│   ├── dtos/           (cliente, veiculo, peca)
│   ├── mappers/        (cliente, peca)
│   └── use-cases/      (cliente, veiculo, peca)
├── infrastructure/
│   ├── database/mongodb/
│   │   ├── connection.ts
│   │   ├── schemas/    (cliente, veiculo, peca, item-estoque, ordem-servico)
│   │   └── repositories/ (impl de todos acima)
│   └── security/       (jwt.service, hash.service)
├── presentation/
│   ├── controllers/    (auth, cliente, veiculo, peca, health)
│   ├── middlewares/    (auth, error)
│   ├── routes/         (auth, cliente, veiculo, peca, health)
│   └── validators/     (cliente, veiculo, peca)
└── shared/
    └── errors/domain.error.ts

tests/
├── domain/
│   ├── entities/       (cliente, veiculo, peca, item-estoque, ordem-servico, servico)
│   ├── value-objects/  (cpf-cnpj, endereco, placa, numero-os)
│   └── services/       (inventory.service)
├── application/use-cases/
│   ├── cliente/        (create, get, update, list, deactivate)
│   ├── veiculo/        (create, get, update, list-by-cliente)
│   └── peca/           (create, get, update, list, deactivate)
└── application/services/
    ├── hash.service.spec.ts
    └── jwt.service.spec.ts
```

### Adições da Fase 2

```
src/
├── domain/services/notification.service.ts       (port INotificationService)
├── infrastructure/notifications/
│   └── nodemailer-notification.service.ts
├── presentation/middlewares/webhook-auth.middleware.ts
├── application/use-cases/ordem-servico/
│   ├── notificar-mudanca-status.helper.ts
│   └── processar-aprovacao-orcamento.use-case.ts
└── main/factories/ordem-servico.factory.ts        (composition root)

tests/
├── setup/mongo-memory.helper.ts                    (mongodb-memory-server)
├── infrastructure/database/mongodb/repositories/
│   └── ordem-servico.repository.integration.spec.ts
└── integration/ordem-servico-lifecycle.spec.ts

k8s/            (namespace, deployment, service, configmap, secret.example, hpa, mongodb, mailhog, README)
infra/          (main.tf, variables.tf, outputs.tf, terraform.tfvars.example, README)
.github/workflows/ci-cd.yml
```
