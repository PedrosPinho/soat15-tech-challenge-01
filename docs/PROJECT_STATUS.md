# Status do Projeto — Auto Repair Shop Management System

**Última Atualização**: 2026-04-28  
**Testes**: 534 passando | **Cobertura**: Statements 93% | Branches 90% | Functions 84% | Lines 93%  
**Status atual**: Fase 6 concluída → Fase 7 iniciando (Documentação & Entrega)

---

## ✅ Fases Concluídas

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
- Swagger/OpenAPI completo
- Atualização do README.md completo com instruções de uso e objetivos
- Video demonstração (10–15 min)
- PDF entregável

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
- [ ] Swagger/OpenAPI

### Testes
- [x] Unit — domain entities (Cliente, Veiculo, Peca, ItemEstoque, OrdemServico)
- [x] Unit — value objects (CpfCnpj, Endereco, Placa, NumeroOS)
- [x] Unit — use cases (cliente, veiculo, peca, inventory)
- [x] Unit — services (jwt, hash)
- [ ] Integration — repositórios MongoDB
- [ ] E2E — fluxos completos
- [x] Cobertura ≥ 80%

### Quality & Security
- [x] TypeScript strict — type-check limpo
- [x] Rate limiting configurado
- [x] Security headers (Helmet)
- [x] CORS configurado
- [ ] ESLint sem warnings
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
