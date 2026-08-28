# Tasks & Checklist — Fase 3 (Tech Challenge SOAT)

**Base**: `docs/PHASE_3_PLAN.md` (Etapas 1, 2.3, 4 e 7)
**Status atual**: camada PostgreSQL implementada e testada para **todos** os
agregados (Etapa 1, ver seções abaixo). **Etapa 4 concluída**: fábrica de
repositórios trocada para Postgres, MongoDB removido do código e das
dependências, logs estruturados (`pino` + `correlationId`), `SesNotificationService`
selecionável por env var, healthchecks `/health/live`+`/health/ready`,
`docker-compose.yml` com `postgres:16`, e collection Postman versionada.
**Etapa 2.3 concluída**: `authMiddleware` aceita token interno e token de
cliente por CPF, com autorização por escopo nas rotas sensíveis.
**Etapa 7 (CI/CD) escrita nos 4 repositórios** — código pronto, execução real
ainda não confirmada (depende de sessão do Learner Lab).

---

## Etapa 2.3 — Ajustes de autenticação na aplicação principal

- [x] `JwtService`/`JwtPayload` reformulados em dois tipos de claim —
  `InternoTokenPayload` (`sub`, `email`, `scope: 'interno'`) e
  `ClienteTokenPayload` (`sub`, `cpf`, `scope: 'cliente'`) — o formato bate
  exatamente com o que o Lambda Authorizer de `soat15-tech-challenge-auth-lambda`
  já valida (`ClienteTokenClaims`/`InternoTokenClaims`), já que os dois lados
  assinam/validam com o mesmo `JWT_SECRET` (RFC-003). `LoginUseCase` passou a
  assinar `{ sub, email, scope: 'interno' }` (antes: `{ userId, email }`, sem
  `scope`).
- [x] `authMiddleware` aceita os dois tipos de token e popula
  `req.scope`+`req.userId`/`req.userEmail` (interno) ou
  `req.scope`+`req.clienteId`/`req.cpfCnpj` (cliente) — continua validando a
  assinatura localmente, defesa em profundidade mesmo com o Lambda Authorizer
  na borda.
- [x] Novo `requireInternalScope`, encadeado depois de `authMiddleware` em
  **todas** as rotas de gestão (clientes, veículos, peças, catálogo,
  pagamentos, relatórios, e todas as rotas de OS exceto `/buscar`) — um token
  de cliente válido mas de escopo errado agora recebe `403` (`ForbiddenError`,
  branch novo em `error.middleware.ts`), não mais aceito como antes.
- [x] `GET /api/ordens-servico/buscar` deixou de ser público: exige
  `authMiddleware`; com `scope: cliente` só aceita o próprio CPF/CNPJ
  (comparação por dígitos, tolera formatação), com `scope: interno` consulta
  qualquer CPF/CNPJ livremente.
- [x] Testes: `jwt.service.spec.ts` e `auth.middleware.spec.ts` atualizados
  para os dois formatos de claim + testes novos de `requireInternalScope`; 5
  testes de integração novos em `ordem-servico-lifecycle.spec.ts` cobrindo
  403 em rota de gestão com token de cliente, 401 em `/buscar` sem token, 200
  com o próprio CPF, 403 com CPF de outro cliente, 200 com token interno em
  qualquer CPF.
- [x] Swagger (`bearerAuth` + path `/api/ordens-servico/buscar`) documentado
  com os dois escopos — item que tinha ficado pendente na Etapa 4 por
  depender desta.
- [x] `npm run type-check` limpo; 533 testes (528 anteriores + 5 novos) +
  9 testes de integração em `ordem-servico-lifecycle.spec.ts` passando;
  validado também manualmente via `curl` contra Postgres real (os 5 cenários
  de escopo acima, todos com o status HTTP esperado).

### Observações / desvios

- Rotas de cliente/veículo (`cliente.routes.ts`, `veiculo.routes.ts`) também
  passaram a exigir `scope: interno` — o plano só cita explicitamente peças,
  catálogo, relatórios e criação de OS, mas a decisão registrada ("o token de
  cliente só dá acesso aos próprios dados") implica que tudo fora de
  `/buscar` fica fechado por padrão para o token de cliente; abrir rotas
  adicionais para o cliente é decisão de produto, não uma correção deste
  ajuste.
- `POST /api/ordens-servico/:id/orcamento/webhook` não foi tocado — continua
  atrás de `webhookAuthMiddleware` (segredo compartilhado), mecanismo
  independente do JWT.

---

## Etapa 4 — Aplicação principal adaptada

- [x] **Dados**: `src/main/factories/ordem-servico.factory.ts` e as 6 rotas que
  antes instanciavam Mongo direto no módulo (`cliente`, `veiculo`, `peca`,
  `catalogo-servico`, `pagamento`, `relatorios`) trocadas para os repositórios
  Postgres — construção **adiada para o primeiro request** em vez de eager no
  import, porque `getPool()` lança se chamado antes do pool conectar (diferente
  do Mongoose, que bufferizava comandos). `auth.controller.ts` já construía por
  request; só trocou a classe.
- [x] `src/index.ts`: bootstrap agora conecta o pool Postgres
  (`postgres/pool.ts`) antes de aceitar requisições, com `disconnectDatabase()`
  no `SIGTERM`/`SIGINT` (antes: nenhum shutdown gracioso existia).
- [x] Removido `src/infrastructure/database/mongodb/` inteiro (conexão, 8
  repositórios, 8 schemas), `mongoose` e `mongodb-memory-server` do
  `package.json`, e os testes específicos de Mongo (unitários e de integração).
- [x] `tests/integration/ordem-servico-lifecycle.spec.ts` portado de
  `mongodb-memory-server` para Testcontainers Postgres (`setPool()` +
  `startTestDatabase()`), mesmo padrão dos testes de repositório.
- [x] Logs estruturados: `src/shared/logger.ts` (`pino` + `AsyncLocalStorage`)
  e `correlation-id.middleware.ts` (lê/gera `x-correlation-id`, ecoa no
  response). Todos os `console.*` de `src/` substituídos.
- [x] `SesNotificationService` (`@aws-sdk/client-ses`) implementando a mesma
  `INotificationService`; seleção por `NOTIFICATION_PROVIDER=ses|smtp` (default
  `smtp`) em `src/main/factories/notification.factory.ts`, conforme `ADR-005`.
- [x] Healthchecks separados: `HealthController.live()` (nunca toca o banco) e
  `.ready()` (`SELECT 1` no pool); `GET /health` mantido como alias de
  `/health/ready` por compatibilidade. `k8s/deployment.yaml` atualizado
  (`readinessProbe` → `/health/ready`, `livenessProbe` → `/health/live`,
  trocando o `tcpSocket` anterior).
- [x] `docker-compose.yml`: serviço `mongodb` trocado por `postgres:16-alpine`
  (`pg_isready` healthcheck); `app` roda `npm run db:migrate` antes de subir.
  `Dockerfile` passou a copiar `src/.../migrations/` (JS puro, não compilado
  pelo `tsc`) para a imagem final.
- [x] Collection Postman versionada em
  `docs/postman/oficina-api.postman_collection.json` (todas as rotas reais,
  login preenche `{{token}}` via test script), referenciada no `README.md`.
- [ ] **Swagger (`src/swagger.ts`) — parcialmente fora de escopo**: o fluxo de
  token por CPF e os escopos `interno`/`cliente` exigem a Etapa 2.3
  (`authMiddleware` aceitando o token da Lambda), que ainda não está
  implementada na aplicação principal — documentar esse esquema de segurança
  agora descreveria um contrato que a API não tem de fato. Fica para quando a
  Etapa 2.3 for feita.
- [ ] **`InventoryService` não religado aos métodos atômicos do Postgres**
  (`reservar`/`utilizar` de `PostgresItemEstoqueRepository`, ver Etapa 1.3b):
  hoje `InventoryService` não é chamado por nenhum use-case (integração órfã,
  confirmado por investigação) — mudar a interface `IItemEstoqueRepository`
  só para um componente sem consumidor real reescreveria 12 testes sem
  benefício de comportamento observável. Registrado aqui para não se perder.

### Verificação (Etapa 4)

- `npm run type-check` limpo; 528 testes de domínio/aplicação/apresentação
  passando (nenhuma regressão); 65 testes de integração Postgres passando.
- Smoke test manual ponta a ponta contra Postgres real (`docker compose up
  postgres mailhog` + `npm run db:migrate` + app local): `POST /api/clientes`
  → `POST /api/veiculos` → `POST /api/ordens-servico` retornou
  `numeroOS: OS-20260828-0001` (sequência atômica funcionando);
  `/health/live`, `/health/ready` e `/health` responderam `200`;
  `x-correlation-id` gerado e ecoado corretamente.
- `docker compose config` válido; `docker compose build app` **não foi
  possível concluir neste ambiente** — `npm ci` falha dentro do container com
  `Exit handler never called!` (limitação de rede do sandbox para builds
  Docker, não um problema do código; `npm install` direto no host funciona
  normalmente). Recomenda-se validar `docker compose up -d --build` num
  ambiente com acesso de rede irrestrito antes de gravar o vídeo de entrega.

---

## Etapa 1.3 — Camada de infraestrutura na aplicação (agregados simples)

- [x] Dependências confirmadas em `package.json`: `pg`, `@types/pg`, `node-pg-migrate` (dependencies), `@testcontainers/postgresql` + `testcontainers` (devDependencies)
- [x] Scripts `db:migrate` / `db:migrate:down` (`node-pg-migrate up|down -m src/infrastructure/database/postgres/migrations`)
- [x] `src/infrastructure/database/postgres/pool.ts` — pool `pg` com retry/backoff e graceful shutdown, espelhando `mongodb/connection.ts`
- [x] Migrations versionadas em `src/infrastructure/database/postgres/migrations/`: `clientes`, `veiculos`, `pecas`, `itens_estoque`, `catalogo_servicos`, `usuarios` — enums, UNIQUE/FK/CHECK conforme `docs/architecture/data-model.md`, incluindo o índice GIN `to_tsvector('portuguese', descricao)` em `pecas` (e, por simetria com o catálogo de busca existente no Mongo, também em `catalogo_servicos`)
- [x] `PostgresClienteRepository` — implementa `IClienteRepository`; mapper reconstrói o VO `Endereco` a partir das colunas achatadas
- [x] `PostgresVeiculoRepository` — implementa `IVeiculoRepository`
- [x] `PostgresPecaRepository` — implementa `IPecaRepository`, incluindo busca textual via `to_tsvector`/`plainto_tsquery`
- [x] `PostgresCatalogoServicoRepository` — implementa `ICatalogoServicoRepository`
- [x] `PostgresUserRepository` — implementa `IUserRepository`
- [x] `PostgresItemEstoqueRepository` — implementa `IItemEstoqueRepository`; **além da interface**, expõe `reservar`/`utilizar` como métodos atômicos (`UPDATE ... WHERE quantidade_disponivel >= $1`, sem SELECT prévio) prontos para substituir o fluxo read-then-write de `InventoryService` quando a fábrica for trocada — decisão registrada nos comentários do arquivo
- [x] Testes de integração com Testcontainers PostgreSQL em `tests/infrastructure/database/postgres/repositories/` (um container real por spec file, mesma abordagem do `mongodb-memory-server` existente) — 45 testes, incluindo teste de concorrência (15 reservas simultâneas contra 10 unidades disponíveis, sem overselling)
- [x] `npm run type-check`, `npm run test:unit` (242 testes) e a suíte nova de infraestrutura Postgres (45 testes) passando; suíte Mongo existente (74 testes) confirmada intacta
- [x] `OrdemServico`/`Servico`/`Pagamento` (árvore transacional de 3 níveis) — ver Etapa 1.3b abaixo
- [ ] Troca da fábrica de repositórios em `src/main/factories/` para Postgres e remoção do Mongo — próxima tarefa (Etapa 4), agora destravada

### Observações / desvios documentados em relação a `docs/architecture/data-model.md`

- `clientes`: colunas `bairro` e `complemento` adicionadas (exigidas pelo VO `Endereco`); `tipo` usa os valores literais do domínio (`PESSOA_FISICA`/`PESSOA_JURIDICA`).
- `veiculos`: `cor`, `chassi`, `renavam`, `observacoes` adicionados (já existiam no Mongo).
- `pecas`: `preco_compra`, `nivel_minimo`, `nivel_maximo`, `ativo` adicionados.
- `itens_estoque`: `quantidade_maxima` e `criado_em` adicionados.
- Em todos os casos, o motivo é o mesmo: o construtor `Entidade.create()` do domínio exige esses campos, e omiti-los causaria perda de dados na migração — o diagrama ER do documento é uma visão simplificada, não o contrato final de colunas.

---

## Etapa 1.3b — Camada de infraestrutura na aplicação (agregado `OrdemServico`)

- [x] Migrations: `1735300006000_create-ordens-servico.js` (+ tabela auxiliar
  `contadores_numero_os`, substituta atômica do `OSCounterModel` do Mongo —
  `INSERT ... ON CONFLICT (data_chave) DO UPDATE ... RETURNING sequencia`,
  preservando o formato `OS-YYYYMMDD-####` por dia, diferente da `SEQUENCE`
  nativa global sugerida inicialmente em `docs/architecture/data-model.md`),
  `1735300007000_create-servicos-os.js`, `1735300008000_create-servico-pecas.js`,
  `1735300009000_create-pagamentos.js` (com o índice único parcial
  `pagamentos_confirmado_unico_por_os`, substituindo a flag `temPagamento` como
  fonte de verdade de "no máximo um pagamento CONFIRMADO por OS")
- [x] `PostgresOrdemServicoRepository` — implementa `IOrdemServicoRepository`;
  **primeiro repositório do projeto com transação real** (`BEGIN`/`COMMIT` via
  `pool.connect()`), já que `save()`/`update()` gravam a raiz + `DELETE`+`INSERT`
  transacional dos filhos (`servicos_os`, `servico_pecas`) — a entidade é imutável
  e sempre chega inteira. `list()`/`findByClienteId()` carregam os filhos em lote
  (`WHERE ... = ANY($1)`) para evitar N+1. `list()` traduz o `$addFields`/`$switch`
  de peso por status do Mongo para `ORDER BY CASE status WHEN ... END` e o `$nin`
  para `<> ALL(ARRAY[...])`
- [x] `PostgresPagamentoRepository` — implementa `IPagamentoRepository`; `save()`/
  `update()` traduzem a violação do índice único parcial em `ConflictError` (código
  Postgres `23505`), em vez de deixar o erro cru do driver `pg` vazar
- [x] Testes de integração com Testcontainers em
  `tests/infrastructure/database/postgres/repositories/ordem-servico.repository.spec.ts`
  e `pagamento.repository.spec.ts` — 20 testes novos, incluindo: rollback da
  transação quando `numero_os` duplicado viola a UNIQUE (nenhum `servico_os` órfão
  fica gravado), teste de concorrência de `nextSequence` (20 chamadas simultâneas
  produzem 20 sequências distintas, sem colisão) e o índice único parcial de
  pagamento confirmado
- [x] `tests/setup/postgres-testcontainer.helper.ts` — `clearTestDatabase()`
  atualizado com as 4 tabelas novas
- [x] `npm run type-check` limpo; 242 testes de domínio + 65 testes de integração
  Postgres (45 dos agregados simples + 20 novos) passando

### Observações / desvios documentados (agregado `OrdemServico`)

- `ordens_servico`: `data_inicio`, `data_conclusao`, `motivo_cancelamento` e
  `tem_pagamento` adicionados (exigidos pelas transições do domínio); `cpf_cnpj`/
  `placa` são snapshots históricos, como no documento Mongo.
- `servicos_os`: `tempo_real_minutos` e `observacoes` adicionados (exigidos por
  `Servico.concluir()`/`ServicoProps`); coluna `ordem` preserva a posição do array
  original.
- `servico_pecas`: `descricao` adicionada (snapshot opcional já exposto por
  `PecaServico`); `UNIQUE (servico_os_id, peca_id)` reforça no banco a mesma regra
  que `Servico.adicionarPeca()` já valida em memória.
- `pagamentos`: `data_pagamento` e `observacoes` adicionados (exigidos por
  `Pagamento.confirmar()`/`PagamentoProps`).
- Não foi criado `pagamento.factory.ts`: `pagamento.routes.ts`/`relatorios.routes.ts`
  continuam instanciando repositórios Mongo diretamente no módulo (inconsistência
  pré-existente, fora do escopo desta tarefa) — a troca para Postgres na Etapa 4
  precisará editar esses arquivos de rota além de `src/main/factories/`.

### Nota sobre lint

`npm run lint` está quebrado na branch, **antes** desta tarefa (ESLint 10.2.1 não
suporta mais `.eslintrc.json`, exige `eslint.config.js`). Verificado em arquivos
não tocados por esta tarefa (`src/domain/entities/cliente.entity.ts`), portanto
pré-existente. Não corrigido aqui por estar fora do escopo; validação de estilo
feita via `type-check` + revisão manual de consistência com os arquivos Mongo
existentes.

---

## Etapa 7 — CI/CD (código escrito, execução ainda não confirmada)

- [x] `soat15-tech-challenge-01/.github/workflows/ci-cd.yml` reescrito:
  `build` (type-check + build) → `test` (Postgres via service container para
  `health.spec.ts`, Testcontainers para o resto) → `docker-build-push` (ECR,
  só em push) → `deploy` (`aws eks update-kubeconfig`, Secret montado do SSM
  em tempo de deploy, `Job` de migration antes do rollout, `configmap`/
  `deployment`/`service`/`hpa` de `k8s/` com namespace por ambiente —
  `oficina-prod`/`oficina-homolog` no mesmo cluster — via `sed`, smoke test
  `/health/ready`).
- [x] `k8s/` migrado para Postgres/EKS: `configmap.yaml`/`secret.example.yaml`
  trocam Mongo por `DATABASE_URL`+config de notificação; `mongodb.yaml`/
  `mailhog.yaml` removidos; `service.yaml` vira `LoadBalancer` com annotations
  de NLB interno (alvo do VPC Link de `auth-lambda`); novo `job-migrate.yaml`.
- [x] `soat15-tech-challenge-db-infra/.github/workflows/terraform.yml`:
  fmt/validate/tflint (informativo)/plan (comentado na PR)/apply, com
  `terraform workspace select -or-create` por branch (`main`→`prod`,
  `homolog`→`homolog`).
- [x] `soat15-tech-challenge-k8s-infra/.github/workflows/terraform.yml`: idem,
  sem seleção de workspace (cluster único), com smoke test
  `kubectl get nodes`/`kubectl wait --for=condition=Ready` pós-apply.
- [x] `soat15-tech-challenge-auth-lambda/.github/workflows/ci-cd.yml`:
  type-check+testes → build (`esbuild`) → terraform fmt/validate/tflint →
  plan ou apply → teste de fumaça invocando a Lambda de token com um CPF de
  fixture (aceita `200`/`400`/`403`/`404` — não exige seed de dados, só
  `5xx`/timeout é falha real).
- [x] `scripts/refresh-aws-secrets.sh`: publica
  `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_SESSION_TOKEN` da sessão
  atual do Learner Lab nos 4 repositórios via `gh secret set`, com validação
  prévia via `aws sts get-caller-identity`.
- [x] `.tflint.hcl` mínimo (plugin `terraform`, preset `recommended`) nos 3
  repositórios de infra — sem plugin `aws` (evita dependência de download
  extra em CI para um projeto de curso); passo `tflint` é
  `continue-on-error: true`, informativo, não bloqueia o pipeline.
- [x] `README.md` da aplicação atualizado (stack, quick start, endpoints,
  testes, diagrama, seção CI/CD) — ainda tinha várias referências a
  MongoDB/kind/GHCR da Fase 2 que sobraram das Etapas 2.3/4.

### Observações / desvios

- **Nenhum pipeline foi executado de verdade** — só validado localmente:
  YAML sintaticamente válido (`yaml.safe_load`), manifestos `k8s/` aplicados
  com sucesso contra um cluster kind descartável (`kind create cluster` +
  `kubectl apply`, depois destruído), `terraform fmt -check` limpo nos 3
  repos. `terraform validate`/`tflint` **não** puderam ser confirmados neste
  ambiente — `terraform init` falha com erro de checksum ao baixar os
  providers (`hashicorp/aws`, `hashicorp/random`), aparentemente uma
  limitação de rede do sandbox, não um problema do código HCL (o mesmo HCL já
  existia e foi revisado manualmente linha a linha nas sessões anteriores).
- **Endpoint do RDS**: não tem parâmetro SSM próprio (só a senha). O job
  `deploy` da aplicação resolve via `aws rds describe-db-instances` pelo
  `db-instance-identifier` (`soat15-tc-${TF_ENV}-db`, mesma convenção de nome
  de `db-infra/locals.tf`), em vez de um parâmetro adicional — evita
  depender de mais um recurso Terraform fora do escopo desta tarefa.
- **`WEBHOOK_SECRET`**: não é compartilhado com nenhuma Lambda, não tem
  parâmetro SSM — é um GitHub Secret próprio do repositório da aplicação,
  configurado manualmente (fora do escopo de `refresh-aws-secrets.sh`, que é
  só para as credenciais AWS de sessão).
- **Namespace por ambiente**: `k8s/` continua com `namespace: oficina`
  hardcoded nos manifestos (mais simples de ler/testar localmente); o
  pipeline troca para `oficina-prod`/`oficina-homolog` via `sed` antes de
  aplicar — mesmo padrão já usado para trocar a tag da imagem, em vez de
  introduzir Kustomize/Helm só para isso.
- **`lab_role_arn`/nomes de recursos**: os 3 workflows assumem os defaults já
  fixados nos `variables.tf` de cada repositório (`project_name = soat15-tc`,
  conta `442534931336`, `us-east-1`) — se algum desses defaults mudar, os
  workflows (nomes de cluster/repo ECR/identifiers) precisam acompanhar.
