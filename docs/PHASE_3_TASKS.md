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
**Etapa 7 (CI/CD) escrita nos 4 repositórios e executada de verdade** —
`db-infra`, `k8s-infra`, app principal e `auth-lambda` (fases 1 e 2)
aplicados com sucesso contra a AWS real em `homolog` em 2026-09-08,
com deploy do app no EKS e cadeia de autenticação ponta a ponta validada
via `curl` (ver "Execução real" na Etapa 7 abaixo para os bugs achados e
corrigidos nesse processo — nenhum estava previsto, todos só apareceram
na primeira execução real).

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

### Execução real (2026-09-08) — todos os 4 pipelines passaram em `homolog`

Primeira execução de verdade contra a AWS real (Learner Lab), depois de
`scripts/refresh-aws-secrets.sh` publicar as credenciais de sessão nos 4
repositórios. Ordem: `db-infra` → `k8s-infra` → app principal (deploy) →
`auth-lambda` (fase 1, depois fase 2). Todas as 4 pipelines terminaram
verdes; validado end-to-end com `curl` direto no endpoint público do API
Gateway: `POST /auth/token` com CPF não cadastrado → `404` (esperado,
prova que a Lambda alcançou o RDS), `GET /api/health/live` sem token →
`401` do Lambda Authorizer (prova a cadeia API Gateway → VPC Link → NLB →
app no EKS).

Nenhum desses bugs existia no código antes de rodar contra a AWS real —
todos só apareceram na primeira execução de fato e foram corrigidos nesta
sessão, um `git push` por vez, cada um confirmado pelo pipeline real antes
do próximo:

- `k8s-infra`/`auth-lambda` liam `terraform_remote_state.db_infra` sem
  `workspace = "homolog"` — o `db-infra` aplica no workspace `homolog`
  (branch `homolog` → `terraform workspace select homolog`), então o state
  real fica em `env:/homolog/...`, não em `default`. Faltava o parâmetro
  `workspace` no bloco `data "terraform_remote_state"` dos dois repos.
- Node group do EKS falhava (`InvalidParameterException: Requested AMI for
  this version 1.30 is not supported`) — `ami_type` default (`AL2_x86_64`)
  não é mais aceito; precisa `ami_type = "AL2023_x86_64_STANDARD"` explícito.
- `auth-lambda`: faltava o mesmo passo `terraform workspace select` que o
  `db-infra` já tinha — sem isso, `terraform.workspace` ficava `default` e o
  `jwt-secret` era gravado em `/soat15-tc/default/...`, não em
  `/soat15-tc/homolog|prod/...` (o path que o deploy do app lê).
- `auth-lambda`: o job `apply` nunca rodava `npm ci && npm run package` (nem
  tinha `setup-node`) — `terraform apply` falhava com "no such file"
  procurando `dist/token.zip`/`dist/authorizer.zip` (o job `build` empacota,
  mas cada job do GitHub Actions roda num runner isolado).
- `auth-lambda`: `$context.requestHeaderValue.x-correlation-id` no formato
  de access log da API Gateway não existe na referência de variáveis do
  API Gateway v2 (`CreateStage` 400) — campo removido (só afetava um log de
  conveniência).
- `auth-lambda`: o smoke test fazia `base64` do payload manualmente E usava
  `--cli-binary-format raw-in-base64-out` (que espera entrada **crua**) —
  resultado, a Lambda recebia a string base64 como corpo. Corrigido para
  mandar o JSON cru; e o payload em si precisou virar um envelope
  `APIGatewayProxyEventV2` completo (`body`/`headers`/`requestContext.
  requestId`), já que o handler só roda atrás do API Gateway em produção.
- App principal: `DATABASE_URL` montada sem URL-encode da senha do RDS —
  `random_password` do `db-infra` permite `# % ? [ ]` (fora do que o RDS
  proíbe: `/ @ " espaço`), e qualquer um desses quebra o parser de URL do
  `pg`/`node-pg-migrate` sem escapar (`TypeError: Invalid URL`). Corrigido
  com `jq -rn --arg v "$DB_PASSWORD" '$v|@uri'`.
- App principal: RDS exige SSL (`no pg_hba.conf entry ... no encryption`);
  `sslmode=require` sozinho não bastou — `pg` moderno trata `require` como
  alias de `verify-full`, e a imagem não tem o bundle de CA da AWS RDS, daí
  `SELF_SIGNED_CERT_IN_CHAIN`. Solução pragmática (tráfego já dentro da VPC
  privada): `sslmode=no-verify` — ainda criptografa, só não valida a cadeia.
- `k8s-infra`: NLB do Service da app ficava preso em `<pending>` —
  `aws-load-balancer-controller` logava `no EC2 IMDS role found`. Causa:
  launch template customizado dos nós sem `metadata_options`, que volta pro
  default da API (`http_put_response_hop_limit = 1`); tráfego de um Pod até
  o IMDS (169.254.169.254) precisa de 2 hops. Sem OIDC/IRSA disponível no
  Learner Lab, o controller depende do IMDS do node pra pegar a `LabRole` —
  corrigido com `http_put_response_hop_limit = 2` explícito.
- `auth-lambda` fase 2: a versão do controller instalada (v3.5.0) tageia o
  NLB com `service.k8s.aws/stack` (formato `<namespace>/<service>`), não
  mais com a tag legada `kubernetes.io/service-name` que o `data "aws_lb"`
  procurava — nunca teria dado match. Também o valor default assumia
  namespace `oficina` (devia ser `oficina-homolog`/`oficina-prod`); agora o
  pipeline exporta `TF_VAR_eks_service_tag_value` calculado a partir do
  workspace. E a porta do listener assumida (`80`) não batia com a porta
  real do Service (`3001`, de `k8s/service.yaml`).

### Observações / desvios

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

### `db:seed` implementado e fluxo de cliente validado fim a fim (2026-09-08)

`npm run db:seed` era só uma entrada quebrada no `package.json` desde a Fase 2
(apontava pra um arquivo que nunca existiu) — sem isso não havia CPF/usuário
cadastrado pra testar a aplicação de verdade. Implementado
`src/infrastructure/database/seeds/index.ts` (idempotente: usuário admin
`admin@oficina.com`/`senha123` + cliente de teste CPF `52998224725`) e um Job
de seed no pipeline (`k8s/job-seed.yaml`), rodando logo depois do de migration
a cada deploy.

- Primeira tentativa falhou (`exit code 127`, "command not found"): o script
  original rodava via `ts-node`, mas a imagem de produção é buildada com
  `npm ci --omit=dev` (sem `ts-node`/`typescript`, só `dist/` compilado — ver
  `Dockerfile`). Corrigido para `node dist/infrastructure/database/seeds/
  index.js`, mesmo padrão do `CMD` da imagem. Validado localmente contra um
  Postgres real (migrations + seed + idempotência) antes do segundo push.
- Com o cliente semeado, validado fim a fim via `curl` no endpoint público:
  `POST /auth/token` com CPF cadastrado → `200` + JWT; `GET
  /api/ordens-servico/buscar?cpfCnpj=<próprio>` com esse token → `200`
  (lista vazia, correto); mesmo token com CPF de terceiro na query → `403`
  ("Cliente só pode consultar as próprias ordens de serviço") — prova que
  `restrictBuscaToOwnCpf` funciona de ponta a ponta contra a AWS real.
- **Achado corrigido**: `POST /api/auth/login` (login interno e-mail/senha)
  era inalcançável pelo endpoint público — a única rota pública do API
  Gateway era `POST /auth/token`; tudo sob `/api/*` (incluindo
  `/api/auth/login`) passava pelo Lambda Authorizer, que exige um token que
  só existe depois de logar. Corrigido em `soat15-tech-challenge-auth-lambda/
  terraform/api_gateway.tf` com uma rota exata `POST /api/auth/login` (sem
  autorizador) usando a mesma integração `HTTP_PROXY`/VPC Link da rota
  protegida — rotas exatas têm prioridade sobre o catch-all `ANY
  /api/{proxy+}`, então só esse path fica público, sem duplicar a lógica de
  login (que já existe e é testada na aplicação principal) numa Lambda à
  parte. Validado via `curl`: login com credencial válida → `200` + JWT
  `scope: interno`; esse token em `GET /api/clientes` → `200` (lista o
  cliente semeado); senha errada → `401`.

### Etapa 5 — Observabilidade (New Relic): APM + infra do cluster instrumentados

Implementado o que não depende só de esperar dados chegarem (ver RFC-004):

- `newrelic` como dependência da aplicação; agente carregado como o primeiro
  `require` de `src/index.ts` (antes de qualquer outro módulo, para
  instrumentar `http`/`pg` corretamente). Configurado 100% por env var
  (`NEW_RELIC_NO_CONFIG_FILE=true`, sem `newrelic.js`) — `NEW_RELIC_APP_NAME`
  por ambiente e `NEW_RELIC_LICENSE_KEY` (do GitHub Secret, hoje vazio) vêm
  do Secret que o pipeline já monta; o agente detecta a licença ausente e
  fica desabilitado sem lançar erro, então isso já está mesclado em
  `homolog` mesmo sem conta New Relic ainda existir.
- `notificar-mudanca-status.helper.ts` (chamado pelos 7 use-cases de
  transição de status) ganhou o parâmetro `statusAnterior` e emite
  `newrelic.recordCustomEvent('OrdemServicoStatusChanged', {numeroOS,
  statusAnterior, statusNovo})` — base do dashboard de "tempo médio por
  status". O `catch` já usava `logger.error` estruturado (não precisou de
  ajuste, ao contrário do que o `PHASE_3_PLAN.md` supunha).
- `nri-bundle` via Helm em `soat15-tech-challenge-k8s-infra/newrelic.tf` —
  agente de infraestrutura do cluster (CPU/memória de pods/nós,
  `kube-state-metrics`, eventos, forwarder de logs). Gated por
  `var.enable_new_relic` (default `false`, mesmo padrão de
  `enable_vpc_link_integration` do `auth-lambda`): sem license key válida o
  pod entraria em `CrashLoopBackOff`. O pipeline (`terraform.yml`) liga a
  flag sozinho quando o secret `NEW_RELIC_LICENSE_KEY` existir no repositório
  `k8s-infra`.
- Validado localmente: `npm run type-check` limpo; 532 testes unitários
  (`tests/application`, `tests/domain`, `tests/presentation`) passando,
  incluindo o novo teste do evento customizado; mock manual em
  `tests/__mocks__/newrelic.js` evita que a suíte carregue o agente de
  verdade. `tests/integration/health.spec.ts` (que importa `src/index.ts`)
  trava neste sandbox de desenvolvimento mesmo com o `require('newrelic')`
  desligado manualmente para teste — confirmado que não é causado por esta
  mudança (limitação de rede pré-existente do ambiente, mesma categoria do
  `docker compose build` que já não completava aqui); a suíte completa
  sempre rodou de verdade no job `test` do CI (GitHub-hosted runner), que é
  quem valida isso de fato.

**Pendências para ligar de vez:**
1. **Precisa da license key do New Relic** (conta free tier, criar em
   newrelic.com) como GitHub Secret `NEW_RELIC_LICENSE_KEY` em **dois**
   repositórios: `soat15-tech-challenge-01` (liga o APM) e
   `soat15-tech-challenge-k8s-infra` (liga o `nri-bundle`). Sem isso os dois
   ficam desabilitados de propósito, sem quebrar nada.
2. **Achado (não implementado, limitação de arquitetura do Learner Lab)**:
   instrumentação das Lambdas (`auth-lambda`) via layer do New Relic, listada
   no `PHASE_3_PLAN.md`, não foi feita. Motivo: as duas Lambdas rodam nas
   subnets privadas do `db-infra` **sem NAT Gateway** (decisão de orçamento
   documentada em `db-infra`), ou seja, sem rota de saída para a internet — o
   layer/extensão do New Relic para Lambda precisa alcançar o coletor da New
   Relic via HTTPS, o que travaria (ou daria timeout) exatamente como
   aconteceria com qualquer outro destino externo. A alternativa sem agente
   (integração AWS/CloudWatch nativa da New Relic, que só precisa de uma IAM
   role de leitura) também esbarra no Learner Lab bloquear criação de IAM
   role própria (mesma restrição do ADR-006). Sem resolver isso (NAT Gateway
   pago, ou aceitar só os logs/métricas nativos do CloudWatch sem New Relic),
   as duas Lambdas ficam de fora do APM — cobertas só indiretamente pelos
   logs de erro que a própria aplicação principal já grava quando a chamada a
   `POST /auth/token` falha.
3. Dashboards e alertas em si (as 4 telas exigidas + condições NRQL) ainda
   não foram criados — dependem de dados reais chegando primeiro (item 1) e
   de decidir se serão feitos manualmente na UI da New Relic ou como código
   (Terraform provider `newrelic`, que exigiria mais uma credencial: um User
   API Key + Account ID, além da license key).
