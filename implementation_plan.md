# Implementation Plan — Auto Repair Shop Management System MVP

## Overview

This document outlines the detailed implementation plan for Phase 1 (MVP) of the Auto Repair Shop Management System. The MVP focuses on the core service order workflow with simplified bounded contexts in a monolithic architecture.

## Project Constraints & Requirements

### Tech Challenge Requirements (Phase 1)
- ✅ Monolithic backend (layered architecture acceptable for MVP)
- ✅ Node.js with TypeScript
- ✅ MongoDB database (justified below)
- ✅ RESTful APIs with Swagger documentation
- ✅ JWT authentication for administrative APIs
- ✅ Docker + docker-compose for deployment
- ✅ 80% test coverage for critical domains
- ✅ DDD principles with Event Storming documentation
- ✅ Security scan and vulnerability analysis

### Database Choice Justification: MongoDB

**Why MongoDB?**
1. **Document Model Alignment**: Domain entities naturally map to JSON documents (Cliente with embedded Endereco, OrdemServico with nested Servicos)
2. **Flexible Schema**: Easy evolution as business requirements change (common in startups/MVP phases)
3. **Aggregate Storage**: Each aggregate root can be a document with embedded children, enforcing consistency boundaries
4. **Event Sourcing Ready**: Native support for storing event streams as document arrays
5. **Horizontal Scalability**: Built-in sharding for future microservices migration
6. **Development Speed**: Mongoose ODM provides excellent TypeScript support and validation

**Tradeoffs Acknowledged**:
- No native ACID transactions across collections (mitigated by aggregate design)
- Eventual consistency requires careful design (handled via domain events)

## MVP Scope Reduction

### Full System (from Miro) → MVP (Phase 1)

**INCLUDED in MVP**:
- ✅ Cliente & Veículo management (Atendimento context)
- ✅ Ordem de Serviço (OS) complete lifecycle
- ✅ Serviços within OS
- ✅ Peças catalog and basic inventory
- ✅ Mock payment registration (no external gateway)
- ✅ Basic authentication & authorization

**DEFERRED to Phase 2+**:
- ⏸️ Agendamento (appointments) - direct walk-in only in MVP
- ⏸️ Diagnóstico formal entity - simplified to OS notes
- ⏸️ Orçamento approval workflow - auto-approve for MVP
- ⏸️ Fornecedor & PedidoCompra - manual inventory replenishment
- ⏸️ Parcela installments - single payment only
- ⏸️ AutorizacaoAdicional - fixed scope services only
- ⏸️ Multiple Estoque locations - single warehouse
- ⏸️ Mecânico specialization - any mechanic any service

### Simplified Domain Model for MVP

```
Cliente (1) ──────┐
                  ├──> Veículo (*)
                  └──> OrdemServico (*) ──┐
                                          ├──> Servico (*)
                                          │
Peça (*) <────────────────────────────────┘
                                          │
                                          └──> Pagamento (1)
```

## Architecture

### Layered Monolith Structure

```
src/
├── presentation/       # REST API controllers
│   ├── controllers/
│   ├── middlewares/
│   ├── validators/
│   └── routes/
├── application/        # Use cases / application services
│   ├── use-cases/
│   ├── dtos/
│   └── mappers/
├── domain/            # Core business logic
│   ├── entities/
│   ├── value-objects/
│   ├── aggregates/
│   ├── repositories/  # interfaces
│   ├── services/
│   └── events/
├── infrastructure/    # External concerns
│   ├── database/
│   │   ├── mongodb/
│   │   └── repositories/  # implementations
│   ├── security/
│   └── logging/
└── shared/           # Cross-cutting
    ├── errors/
    ├── validators/
    └── utils/
```

## Implementation Phases

### Phase 0: Project Bootstrap (Days 1-2)

**Goal**: Development environment ready with basic infrastructure

#### Task 0.1: Initialize Project Structure
**Acceptance Criteria**:
- ✅ Node.js 20+ project with TypeScript 5+
- ✅ Package.json with all dependencies
- ✅ tsconfig.json with strict mode
- ✅ ESLint + Prettier configured
- ✅ Folder structure matches architecture
- ✅ Git repository initialized with .gitignore

**Files to Create**:
- `package.json`
- `tsconfig.json`
- `.eslintrc.json`
- `.prettierrc`
- `src/index.ts` (entry point)
- `.env.example`

**Tests**: N/A (infrastructure task)

---

#### Task 0.2: Setup MongoDB Connection
**Acceptance Criteria**:
- ✅ MongoDB connection utility
- ✅ Mongoose schemas for all entities
- ✅ Connection pooling configured
- ✅ Environment-based connection string
- ✅ Graceful shutdown handling

**Files to Create**:
- `src/infrastructure/database/mongodb/connection.ts`
- `src/infrastructure/database/mongodb/schemas/`
- `.env` (from .env.example)

**Tests**:
- Integration test: Connect and disconnect from MongoDB
- Unit test: Environment variable validation

---

#### Task 0.3: Docker Configuration
**Acceptance Criteria**:
- ✅ Dockerfile for Node.js app
- ✅ docker-compose.yml with app + MongoDB
- ✅ Health check endpoints
- ✅ Volume mounts for persistence
- ✅ `docker-compose up` starts entire stack

**Files to Create**:
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `src/presentation/controllers/health.controller.ts`

**Tests**:
- Integration test: Health endpoint returns 200

---

#### Task 0.4: Authentication Infrastructure
**Acceptance Criteria**:
- ✅ JWT generation and validation
- ✅ Password hashing (bcrypt)
- ✅ Auth middleware for protected routes
- ✅ Basic User model for admin access
- ✅ Login endpoint

**Files to Create**:
- `src/infrastructure/security/jwt.service.ts`
- `src/infrastructure/security/hash.service.ts`
- `src/presentation/middlewares/auth.middleware.ts`
- `src/domain/entities/user.entity.ts`

**Tests**:
- Unit test: JWT sign and verify
- Unit test: Password hash and compare
- Integration test: Auth middleware blocks unauthenticated requests

---

### Phase 1: Cliente & Veículo Management (Days 3-5)

**Goal**: Customer and vehicle CRUD with validation

#### Task 1.1: Cliente Entity & Repository
**Acceptance Criteria**:
- ✅ Cliente domain entity with all attributes
- ✅ CPF/CNPJ validation logic
- ✅ Endereco value object
- ✅ Cliente repository interface + MongoDB implementation
- ✅ Mock in-memory repository for testing

**Files to Create**:
- `src/domain/entities/cliente.entity.ts`
- `src/domain/value-objects/endereco.vo.ts`
- `src/domain/value-objects/cpf-cnpj.vo.ts`
- `src/domain/repositories/cliente.repository.ts` (interface)
- `src/infrastructure/database/repositories/cliente.repository.impl.ts`
- `tests/domain/entities/cliente.entity.spec.ts`

**Tests**:
- ✅ Unit: CPF validation (valid/invalid cases)
- ✅ Unit: CNPJ validation (valid/invalid cases)
- ✅ Unit: Cliente creation with valid data
- ✅ Unit: Cliente creation fails with invalid email
- ✅ Integration: Save and retrieve Cliente from repository

**Demo**: 
- Postman collection: Create cliente with CPF
- Postman collection: Create cliente with CNPJ
- Show validation errors for invalid inputs

---

#### Task 1.2: Cliente Use Cases & API
**Acceptance Criteria**:
- ✅ CreateCliente use case
- ✅ GetCliente use case
- ✅ UpdateCliente use case
- ✅ ListClientes use case (with pagination)
- ✅ DeactivateCliente use case (soft delete)
- ✅ REST endpoints: POST, GET, PUT, DELETE /api/clientes
- ✅ Request/response DTOs
- ✅ Input validation middleware

**Files to Create**:
- `src/application/use-cases/cliente/create-cliente.use-case.ts`
- `src/application/use-cases/cliente/get-cliente.use-case.ts`
- `src/application/use-cases/cliente/update-cliente.use-case.ts`
- `src/application/use-cases/cliente/list-clientes.use-case.ts`
- `src/application/dtos/cliente/create-cliente.dto.ts`
- `src/presentation/controllers/cliente.controller.ts`
- `src/presentation/routes/cliente.routes.ts`
- `src/presentation/validators/cliente.validator.ts`

**Tests**:
- ✅ Unit: CreateCliente use case with valid data
- ✅ Unit: CreateCliente fails with duplicate CPF
- ✅ Integration: POST /api/clientes creates and returns 201
- ✅ Integration: GET /api/clientes/:id returns 200
- ✅ Integration: GET /api/clientes returns paginated list
- ✅ Integration: PUT requires authentication

**Demo**:
- Create 5 clientes via API
- List all clientes (pagination)
- Get specific cliente details
- Update cliente contact info
- Deactivate cliente

---

#### Task 1.3: Veículo Entity & Repository
**Acceptance Criteria**:
- ✅ Veículo domain entity
- ✅ Brazilian license plate validation (ABC-1234, ABC1D23)
- ✅ Veículo repository interface + implementation
- ✅ Relationship to Cliente (foreign key)

**Files to Create**:
- `src/domain/entities/veiculo.entity.ts`
- `src/domain/value-objects/placa.vo.ts`
- `src/domain/repositories/veiculo.repository.ts`
- `src/infrastructure/database/repositories/veiculo.repository.impl.ts`

**Tests**:
- ✅ Unit: Placa validation (old and Mercosul formats)
- ✅ Unit: Veículo creation
- ✅ Unit: Quilometragem can only increase
- ✅ Integration: Save and retrieve Veículo

**Demo**:
- Show placa validation with valid/invalid formats

---

#### Task 1.4: Veículo Use Cases & API
**Acceptance Criteria**:
- ✅ CreateVeiculo use case
- ✅ GetVeiculo use case
- ✅ UpdateVeiculo use case
- ✅ ListVeiculosByCliente use case
- ✅ REST endpoints: POST, GET, PUT /api/veiculos
- ✅ GET /api/clientes/:clienteId/veiculos

**Files to Create**:
- `src/application/use-cases/veiculo/*.ts`
- `src/application/dtos/veiculo/*.ts`
- `src/presentation/controllers/veiculo.controller.ts`
- `src/presentation/routes/veiculo.routes.ts`

**Tests**:
- ✅ Unit: CreateVeiculo validates cliente exists
- ✅ Unit: UpdateVeiculo prevents quilometragem decrease
- ✅ Integration: POST /api/veiculos creates vehicle
- ✅ Integration: GET /api/clientes/:id/veiculos returns list

**Demo**:
- Create 3 vehicles for a cliente
- List all vehicles for cliente
- Update vehicle mileage
- Attempt invalid mileage update (should fail)

---

### Phase 2: Peças & Inventory (Days 6-8)

**Goal**: Parts catalog and basic stock management

#### Task 2.1: Peça Entity & Repository
**Acceptance Criteria**:
- ✅ Peça domain entity
- ✅ Unique codigo (SKU) validation
- ✅ Pricing with margin calculation
- ✅ Stock level attributes (min/max)
- ✅ Peça repository

**Files to Create**:
- `src/domain/entities/peca.entity.ts`
- `src/domain/repositories/peca.repository.ts`
- `src/infrastructure/database/repositories/peca.repository.impl.ts`

**Tests**:
- ✅ Unit: Peça margin calculation
- ✅ Unit: Peça validates precoVenda >= precoCompra
- ✅ Integration: Save and retrieve Peça

**Demo**:
- Create parts catalog with 10 items

---

#### Task 2.2: Peça Use Cases & API
**Acceptance Criteria**:
- ✅ CreatePeca use case
- ✅ GetPeca use case
- ✅ UpdatePeca use case
- ✅ ListPecas use case (with search/filter)
- ✅ REST endpoints: POST, GET, PUT /api/pecas

**Files to Create**:
- `src/application/use-cases/peca/*.ts`
- `src/application/dtos/peca/*.ts`
- `src/presentation/controllers/peca.controller.ts`
- `src/presentation/routes/peca.routes.ts`

**Tests**:
- ✅ Unit: CreatePeca validates unique codigo
- ✅ Integration: POST /api/pecas creates part
- ✅ Integration: GET /api/pecas?categoria=MOTOR filters correctly

**Demo**:
- Create parts in different categories
- Search parts by category
- Update part pricing

---

#### Task 2.3: Simple Inventory Management
**Acceptance Criteria**:
- ✅ ItemEstoque entity (simplified - single warehouse)
- ✅ Stock quantity tracking (available, reserved)
- ✅ Reserve and utilize operations
- ✅ Low stock detection

**Files to Create**:
- `src/domain/entities/item-estoque.entity.ts`
- `src/domain/services/inventory.service.ts`
- `src/infrastructure/database/repositories/item-estoque.repository.impl.ts`

**Tests**:
- ✅ Unit: Reserve decrements available, increments reserved
- ✅ Unit: Utilize decrements reserved
- ✅ Unit: Cannot reserve more than available
- ✅ Integration: Stock operations persist correctly

**Demo**:
- Add stock for parts
- Reserve parts (show available/reserved changes)
- Utilize reserved parts

---

### Phase 3: Ordem de Serviço (Days 9-13)

**Goal**: Core service order workflow

#### Task 3.1: OrdemServico Entity & Aggregate
**Acceptance Criteria**:
- ✅ OrdemServico aggregate root
- ✅ Auto-generated numeroOS (OS-YYYYMMDD-####)
- ✅ Status state machine (ABERTA → EM_ANDAMENTO → CONCLUIDA)
- ✅ Relationship to Cliente and Veículo
- ✅ Repository implementation

**Files to Create**:
- `src/domain/entities/ordem-servico.entity.ts`
- `src/domain/value-objects/numero-os.vo.ts`
- `src/domain/repositories/ordem-servico.repository.ts`
- `src/infrastructure/database/repositories/ordem-servico.repository.impl.ts`

**Tests**:
- ✅ Unit: NumeroOS generation with correct format
- ✅ Unit: Status transition validation
- ✅ Unit: Cannot cancel OS if payment exists
- ✅ Integration: Save and retrieve OS

**Demo**:
- Show OS number generation pattern

---

#### Task 3.2: Servico Entity (OS Child)
**Acceptance Criteria**:
- ✅ Servico entity with status
- ✅ Time tracking (estimated vs actual)
- ✅ Embedded in OS aggregate
- ✅ Peças association

**Files to Create**:
- `src/domain/entities/servico.entity.ts`

**Tests**:
- ✅ Unit: Servico time calculation
- ✅ Unit: Servico status transitions

---

#### Task 3.3: CreateOrdemServico Use Case
**Acceptance Criteria**:
- ✅ Validates Cliente and Veículo exist
- ✅ Creates OS with servicos
- ✅ Reserves peças for each servico
- ✅ Calculates total value
- ✅ Returns DTO with all details

**Files to Create**:
- `src/application/use-cases/ordem-servico/create-ordem-servico.use-case.ts`
- `src/application/dtos/ordem-servico/create-ordem-servico.dto.ts`
- `src/domain/services/orcamento-calculator.service.ts`

**Tests**:
- ✅ Unit: CreateOS validates cliente exists
- ✅ Unit: CreateOS validates veiculo exists
- ✅ Unit: CreateOS reserves peças
- ✅ Unit: CreateOS fails if insufficient stock
- ✅ Integration: Full OS creation workflow

**Demo**:
- Create OS with multiple services
- Create OS with parts (show stock reservation)
- Attempt OS with insufficient stock (should fail)

---

#### Task 3.4: OrdemServico Lifecycle Use Cases
**Acceptance Criteria**:
- ✅ StartOrdemServico use case
- ✅ CompleteOrdemServico use case
- ✅ GetOrdemServico use case
- ✅ ListOrdensServico use case (with filters)
- ✅ CancelOrdemServico use case

**Files to Create**:
- `src/application/use-cases/ordem-servico/start-ordem-servico.use-case.ts`
- `src/application/use-cases/ordem-servico/complete-ordem-servico.use-case.ts`
- `src/application/use-cases/ordem-servico/get-ordem-servico.use-case.ts`
- `src/application/use-cases/ordem-servico/list-ordens-servico.use-case.ts`

**Tests**:
- ✅ Unit: StartOS transitions to EM_ANDAMENTO
- ✅ Unit: CompleteOS validates all servicos complete
- ✅ Unit: CompleteOS utilizes reserved peças
- ✅ Integration: Complete OS workflow from ABERTA to CONCLUIDA

**Demo**:
- Create OS → Start OS → Complete OS (full lifecycle)
- List OS with status filter
- Show stock utilization after completion

---

#### Task 3.5: OrdemServico REST API
**Acceptance Criteria**:
- ✅ POST /api/ordens-servico (create)
- ✅ GET /api/ordens-servico (list with filters)
- ✅ GET /api/ordens-servico/:id (details)
- ✅ PATCH /api/ordens-servico/:id/start
- ✅ PATCH /api/ordens-servico/:id/complete
- ✅ DELETE /api/ordens-servico/:id (cancel)
- ✅ All endpoints require authentication

**Files to Create**:
- `src/presentation/controllers/ordem-servico.controller.ts`
- `src/presentation/routes/ordem-servico.routes.ts`
- `src/presentation/validators/ordem-servico.validator.ts`

**Tests**:
- ✅ Integration: POST creates OS and returns 201
- ✅ Integration: GET returns paginated list
- ✅ Integration: PATCH /start transitions status
- ✅ Integration: All endpoints require JWT

**Demo**:
- Full API workflow via Postman
- Show authentication requirement

---

### Phase 4: Payment & Reports (Days 14-16)

**Goal**: Payment registration and basic reporting

#### Task 4.1: Pagamento Entity & Use Case
**Acceptance Criteria**:
- ✅ Pagamento entity (simplified - no installments in MVP)
- ✅ Payment methods enum
- ✅ Payment status tracking
- ✅ One payment per OS (1:1 relationship)
- ✅ Can only pay CONCLUIDA OS

**Files to Create**:
- `src/domain/entities/pagamento.entity.ts`
- `src/domain/repositories/pagamento.repository.ts`
- `src/application/use-cases/pagamento/register-pagamento.use-case.ts`
- `src/infrastructure/database/repositories/pagamento.repository.impl.ts`

**Tests**:
- ✅ Unit: RegisterPagamento validates OS is CONCLUIDA
- ✅ Unit: RegisterPagamento prevents duplicate payment
- ✅ Integration: Payment creation and retrieval

**Demo**:
- Complete OS then register payment
- Attempt payment on incomplete OS (should fail)

---

#### Task 4.2: Pagamento REST API
**Acceptance Criteria**:
- ✅ POST /api/ordens-servico/:id/pagamento
- ✅ GET /api/pagamentos (list)
- ✅ GET /api/pagamentos/:id

**Files to Create**:
- `src/presentation/controllers/pagamento.controller.ts`
- `src/presentation/routes/pagamento.routes.ts`

**Tests**:
- ✅ Integration: POST creates payment
- ✅ Integration: GET returns payment details

**Demo**:
- Register payment for completed OS
- List all payments

---

#### Task 4.3: Dashboard & Reports
**Acceptance Criteria**:
- ✅ GET /api/reports/dashboard (summary stats)
- ✅ GET /api/reports/ordens-servico (OS by status)
- ✅ GET /api/reports/estoque (low stock items)
- ✅ GET /api/clientes/:id/historico (service history)

**Files to Create**:
- `src/application/use-cases/reports/*.ts`
- `src/presentation/controllers/reports.controller.ts`
- `src/presentation/routes/reports.routes.ts`

**Tests**:
- ✅ Integration: Dashboard returns correct counts
- ✅ Integration: Service history for cliente

**Demo**:
- Show dashboard with live data
- View cliente service history
- Check low stock report

---

### Phase 5: Testing & Quality (Days 17-19)

**Goal**: Achieve 80% coverage and pass quality gates

#### Task 5.1: Unit Test Coverage
**Acceptance Criteria**:
- ✅ All domain entities have unit tests
- ✅ All use cases have unit tests
- ✅ All value objects have unit tests
- ✅ Coverage report shows 80%+ for domain layer

**Tools**:
- Jest for testing
- Istanbul/NYC for coverage

**Commands**:
```bash
npm test
npm run test:coverage
```

---

#### Task 5.2: Integration Test Coverage
**Acceptance Criteria**:
- ✅ All API endpoints have integration tests
- ✅ Repository implementations tested against real MongoDB
- ✅ End-to-end workflows tested (create cliente → create veiculo → create OS → complete → pay)

**Tools**:
- Supertest for API testing
- MongoDB Memory Server for isolated tests

---

#### Task 5.3: Security Analysis
**Acceptance Criteria**:
- ✅ npm audit with no high/critical vulnerabilities
- ✅ OWASP dependency check
- ✅ Snyk scan completed
- ✅ SQL injection prevention (N/A for MongoDB, but validate inputs)
- ✅ XSS prevention in responses
- ✅ CORS configured correctly
- ✅ Rate limiting on APIs

**Files to Create**:
- `docs/security_analysis.md`
- `src/presentation/middlewares/rate-limit.middleware.ts`
- `src/presentation/middlewares/sanitize.middleware.ts`

**Tools**:
- npm audit
- Snyk CLI
- OWASP Dependency-Check

---

### Phase 6: Documentation & Delivery (Days 20-21)

**Goal**: Complete all deliverables for Tech Challenge

#### Task 6.1: API Documentation
**Acceptance Criteria**:
- ✅ Swagger/OpenAPI 3.0 spec
- ✅ All endpoints documented
- ✅ Request/response examples
- ✅ Authentication flow documented
- ✅ Swagger UI accessible at /api-docs

**Files to Create**:
- `src/infrastructure/swagger/swagger.config.ts`
- `src/infrastructure/swagger/schemas/*.ts`

**Tools**:
- swagger-jsdoc
- swagger-ui-express

---

#### Task 6.2: README & Setup Instructions
**Acceptance Criteria**:
- ✅ Project overview
- ✅ Technology stack
- ✅ Prerequisites
- ✅ Local setup instructions
- ✅ Docker setup instructions
- ✅ Environment variables documented
- ✅ API usage examples
- ✅ Testing instructions

**Files to Create/Update**:
- `README.md`
- `docs/API_USAGE.md`
- `docs/TESTING.md`

---

#### Task 6.3: DDD Documentation
**Acceptance Criteria**:
- ✅ Event Storming diagram exported from Miro
- ✅ Context Map diagram
- ✅ Domain Model (UML) diagram
- ✅ Ubiquitous Language glossary
- ✅ All diagrams in docs/ddd/

**Files to Create**:
- `docs/ddd/event_storming.png`
- `docs/ddd/context_map.png`
- `docs/ddd/domain_model.png`
- `docs/ddd/ubiquitous_language.md`

---

#### Task 6.4: Video Demonstration
**Acceptance Criteria**:
- ✅ 10-15 minute video
- ✅ Shows complete workflow:
  - Create cliente
  - Create veículo
  - Create peças
  - Create OS with services
  - Complete OS
  - Register payment
  - View reports
- ✅ Shows authentication
- ✅ Shows validation errors
- ✅ Shows Swagger documentation
- ✅ Demonstrates Docker deployment

**Tools**:
- OBS Studio or Loom
- Postman for API demo

---

#### Task 6.5: Final Deliverable Package
**Acceptance Criteria**:
- ✅ Repository private on GitHub/GitLab
- ✅ User `soatarchitecture` has access
- ✅ PDF document with:
  - Group name
  - Participant Discord usernames
  - Link to Miro board
  - Link to repository
  - Security analysis summary
- ✅ Video uploaded (YouTube unlisted or file)

**Files to Create**:
- `docs/ENTREGA_FASE_1.pdf`

---

## Testing Strategy

### Test Pyramid

```
        E2E Tests (10%)
       /              \
    Integration Tests (30%)
   /                      \
 Unit Tests (60%)
```

### Coverage Targets by Layer

- **Domain Layer**: 90%+ (business logic must be thoroughly tested)
- **Application Layer**: 85%+ (use cases are critical)
- **Presentation Layer**: 70%+ (controllers, middlewares)
- **Infrastructure Layer**: 60%+ (repositories, external integrations)

### Test Categories

1. **Unit Tests**: Pure functions, entities, value objects
2. **Integration Tests**: Repository + DB, API endpoints
3. **E2E Tests**: Complete user workflows

## Quality Gates

Before considering a task "done":

1. ✅ **Code Quality**
   - ESLint passes with no errors
   - Prettier formatting applied
   - No TypeScript compilation errors
   - No `any` types (use unknown + type guards)

2. ✅ **Testing**
   - All tests pass
   - Coverage meets targets for layer
   - No console.log in production code

3. ✅ **Documentation**
   - JSDoc comments on public APIs
   - README updated if needed
   - Swagger annotations added

4. ✅ **Security**
   - Input validation on all endpoints
   - No sensitive data in logs
   - Authentication enforced where required

## Development Guidelines

### Git Workflow

```bash
main (production)
  └── develop (integration)
       ├── feature/task-1.1-cliente-entity
       ├── feature/task-1.2-cliente-api
       └── feature/task-3.1-ordem-servico
```

### Commit Messages

```
feat(cliente): implement CPF/CNPJ validation
fix(os): prevent duplicate payment registration
test(peca): add integration tests for repository
docs(readme): update setup instructions
```

### Branch Naming

- `feature/task-X.Y-description`
- `bugfix/issue-description`
- `docs/documentation-update`

## Demo Checklist

After each phase, demonstrate:

- [ ] Feature works end-to-end via API
- [ ] Validation prevents invalid inputs
- [ ] Authentication blocks unauthorized access
- [ ] Database state is correct
- [ ] Tests pass and coverage is adequate

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| MongoDB transaction limitations | Design aggregates to minimize cross-collection updates |
| TypeScript learning curve | Pair programming, code reviews |
| Test coverage not met | Write tests first (TDD), automated coverage checks |
| Docker issues | Document troubleshooting, provide docker-compose alternative |

### Schedule Risks

| Risk | Mitigation |
|------|------------|
| Feature creep | Strict MVP scope, defer non-essentials |
| Underestimated complexity | Daily standups, re-prioritize if needed |
| Testing takes longer than expected | Continuous testing, not end-phase |

## Success Criteria

### MVP is successful if:

- ✅ All mandatory Tech Challenge requirements met
- ✅ Can create OS from cliente/veiculo → complete → pay
- ✅ Inventory tracks stock correctly
- ✅ 80%+ test coverage achieved
- ✅ Security scan shows no critical issues
- ✅ Docker deployment works on clean machine
- ✅ Swagger documentation is complete
- ✅ Video demonstrates all features

## Next Phases (Post-MVP)

**Phase 2**: 
- Agendamento system
- Diagnóstico workflow
- Orçamento approval

**Phase 3**:
- Fornecedor & Compras
- AutorizacaoAdicional
- Parcelamento

**Phase 4**:
- Microservices migration
- Event sourcing implementation
- External integrations (payment gateway, supplier EDI)

---

**Document Version**: 1.0  
**Last Updated**: Generated from Miro board analysis and Tech Challenge requirements  
**Next Review**: After Phase 0 completion
