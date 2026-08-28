# Tasks & Checklist — Fase 3 (Tech Challenge SOAT)

**Base**: `docs/PHASE_3_PLAN.md` (Etapas 1 e 4)
**Status atual**: camada PostgreSQL implementada e testada para **todos** os
agregados (Etapa 1, ver seções abaixo). **Etapa 4 concluída**: fábrica de
repositórios trocada para Postgres, MongoDB removido do código e das
dependências, logs estruturados (`pino` + `correlationId`), `SesNotificationService`
selecionável por env var, healthchecks `/health/live`+`/health/ready`,
`docker-compose.yml` com `postgres:16`, e collection Postman versionada.

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
