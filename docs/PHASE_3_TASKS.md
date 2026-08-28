# Tasks & Checklist — Fase 3 (Tech Challenge SOAT)

**Base**: `docs/PHASE_3_PLAN.md` (Etapa 1 — Banco de dados gerenciado e migração relacional)
**Status atual**: camada PostgreSQL implementada e testada para os agregados simples
(Cliente, Veículo, Peça, ItemEstoque, CatalogoServico, Usuário). MongoDB continua
em uso em `src/main/factories/` — a troca de fábrica e a migração de
`OrdemServico`/`Servico`/`Pagamento` ficam para uma tarefa seguinte.

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
- [ ] `OrdemServico`/`Servico`/`Pagamento` (árvore transacional de 3 níveis) — deliberadamente fora do escopo desta tarefa, fica para a próxima
- [ ] Troca da fábrica de repositórios em `src/main/factories/` para Postgres e remoção do Mongo — só depois que todos os agregados (incluindo `OrdemServico`) estiverem migrados

### Observações / desvios documentados em relação a `docs/architecture/data-model.md`

- `clientes`: colunas `bairro` e `complemento` adicionadas (exigidas pelo VO `Endereco`); `tipo` usa os valores literais do domínio (`PESSOA_FISICA`/`PESSOA_JURIDICA`).
- `veiculos`: `cor`, `chassi`, `renavam`, `observacoes` adicionados (já existiam no Mongo).
- `pecas`: `preco_compra`, `nivel_minimo`, `nivel_maximo`, `ativo` adicionados.
- `itens_estoque`: `quantidade_maxima` e `criado_em` adicionados.
- Em todos os casos, o motivo é o mesmo: o construtor `Entidade.create()` do domínio exige esses campos, e omiti-los causaria perda de dados na migração — o diagrama ER do documento é uma visão simplificada, não o contrato final de colunas.

### Nota sobre lint

`npm run lint` está quebrado na branch, **antes** desta tarefa (ESLint 10.2.1 não
suporta mais `.eslintrc.json`, exige `eslint.config.js`). Verificado em arquivos
não tocados por esta tarefa (`src/domain/entities/cliente.entity.ts`), portanto
pré-existente. Não corrigido aqui por estar fora do escopo; validação de estilo
feita via `type-check` + revisão manual de consistência com os arquivos Mongo
existentes.
