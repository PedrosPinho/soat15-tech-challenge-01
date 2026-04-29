# Auto Repair Shop Management System

Sistema de gestão para oficinas mecânicas desenvolvido com **Domain-Driven Design (DDD)** e arquitetura em camadas, como Tech Challenge da Pós-Tech SOAT FIAP.

---

## Objetivos

Implementar um sistema integrado que permita à oficina:

- Cadastrar e gerenciar **clientes** (PF e PJ com validação de CPF/CNPJ) e seus **veículos**
- Manter um **catálogo de peças** com controle de preços, margens e estoque
- Manter um **catálogo de serviços** com preço e tempo estimado
- Abrir, executar e encerrar **ordens de serviço** com controle de ciclo de vida
- Registrar **pagamentos** em múltiplas formas
- Consultar um **dashboard** com métricas de operação

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20+ |
| Linguagem | TypeScript 5+ (strict) |
| Framework | Express.js 5 |
| Banco de dados | MongoDB 7 + Mongoose |
| Testes | Jest + ts-jest |
| Documentação | Swagger UI / OpenAPI 3.0 |
| Container | Docker + Docker Compose |
| Qualidade | SonarQube + SonarScanner |
| Segurança | JWT, bcrypt, Helmet, rate limiting |

---

## Arquitetura

```
src/
├── domain/           # Entidades, value objects, regras de negócio, interfaces de repo
├── application/      # Use cases, DTOs, mappers
├── infrastructure/   # MongoDB schemas, implementações de repo, serviços de segurança
├── presentation/     # Controllers, routes, middlewares, validators
└── shared/           # Erros de domínio
```

**Princípios aplicados**: Aggregate Roots, Value Objects (CPF/CNPJ, Placa, Endereço), Repository Pattern, imutabilidade em todas as entidades de domínio, TDD.

---

## Quick Start

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
# edite .env — defina MONGO_PASSWORD, JWT_SECRET e SONAR_TOKEN
```

### 2. Subir os serviços

```bash
docker compose up -d
```

Aguarde ~15 s para o MongoDB inicializar. A API ficará disponível em `http://localhost:3001`.

### 3. Desenvolvimento local (sem Docker para a API)

```bash
npm install
docker compose up -d mongodb   # apenas o banco
npm run dev
```

---

## API

### Autenticação

Todos os endpoints (exceto `/health` e `/api/auth/login`) exigem token JWT no header:

```
Authorization: Bearer <token>
```

**Obter token:**

```bash
POST /api/auth/login
{ "email": "admin@oficina.com", "senha": "senha123" }
```

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/clientes` | Criar cliente |
| `GET` | `/api/clientes` | Listar clientes |
| `GET` | `/api/clientes/:id` | Buscar cliente |
| `PUT` | `/api/clientes/:id` | Atualizar cliente |
| `DELETE` | `/api/clientes/:id` | Desativar cliente |
| `GET` | `/api/clientes/:id/veiculos` | Listar veículos do cliente |
| `POST` | `/api/veiculos` | Criar veículo |
| `GET` | `/api/veiculos/:id` | Buscar veículo |
| `PUT` | `/api/veiculos/:id` | Atualizar veículo |
| `POST` | `/api/pecas` | Criar peça |
| `GET` | `/api/pecas` | Listar peças (filtros: categoria, search) |
| `GET` | `/api/pecas/:id` | Buscar peça |
| `PUT` | `/api/pecas/:id` | Atualizar preço/níveis |
| `DELETE` | `/api/pecas/:id` | Desativar peça |
| `POST` | `/api/servicos` | Criar serviço no catálogo |
| `GET` | `/api/servicos` | Listar serviços |
| `GET` | `/api/servicos/:id` | Buscar serviço |
| `PUT` | `/api/servicos/:id` | Editar serviço |
| `DELETE` | `/api/servicos/:id` | Deletar serviço (soft delete) |
| `POST` | `/api/ordens-servico` | Criar OS |
| `GET` | `/api/ordens-servico` | Listar OS (filtros: status, clienteId, veiculoId) |
| `GET` | `/api/ordens-servico/:id` | Buscar OS |
| `PATCH` | `/api/ordens-servico/:id/iniciar` | Iniciar OS |
| `PATCH` | `/api/ordens-servico/:id/concluir` | Concluir OS |
| `PATCH` | `/api/ordens-servico/:id/cancelar` | Cancelar OS |
| `POST` | `/api/pagamentos` | Registrar pagamento |
| `GET` | `/api/pagamentos` | Listar pagamentos |
| `GET` | `/api/pagamentos/:id` | Buscar pagamento |
| `GET` | `/api/relatorios/dashboard` | Dashboard com métricas |

### Documentação interativa

Com a API rodando, acesse:

- **Swagger UI**: http://localhost:3001/api/docs
- **OpenAPI JSON**: http://localhost:3001/api/docs.json

---

## Testes

```bash
npm test                  # todos os testes
npm run test:coverage     # com relatório de cobertura
npm run test:watch        # modo watch
```

**Cobertura atual**: Statements 93% | Branches 90% | Functions 84% | Lines 93% (threshold mínimo: 80%)

---

## Qualidade — SonarQube

```bash
# Subir SonarQube (http://localhost:9000 — admin/admin no primeiro acesso)
npm run sonar:up

# Gerar cobertura e enviar análise
npm run sonar:scan

# Parar SonarQube
npm run sonar:down
```

Após o primeiro login no SonarQube, gere um token em **My Account → Security** e adicione ao `.env`:

```
SONAR_TOKEN=seu-token-aqui
```

---

## Scripts

```bash
npm run dev             # servidor em modo desenvolvimento (hot reload)
npm run build           # compila TypeScript
npm run start           # inicia versão compilada (produção)
npm run lint            # ESLint
npm run lint:fix        # ESLint com auto-fix
npm run type-check      # verificação de tipos TypeScript
npm run docker:up       # sobe todos os serviços Docker
npm run docker:down     # para todos os serviços Docker
npm run docker:logs     # logs dos serviços em tempo real
```

---

## Fluxo Principal

```
1. POST /api/auth/login            → obter token JWT
2. POST /api/clientes              → cadastrar cliente
3. POST /api/veiculos              → cadastrar veículo vinculado ao cliente
4. POST /api/pecas                 → cadastrar peças no catálogo
5. POST /api/servicos              → cadastrar serviços no catálogo
6. POST /api/ordens-servico        → abrir OS (ABERTA)
7. PATCH /api/ordens-servico/:id/iniciar   → iniciar execução (EM_ANDAMENTO)
8. PATCH /api/ordens-servico/:id/concluir  → encerrar (CONCLUIDA)
9. POST /api/pagamentos            → registrar pagamento
10. GET  /api/relatorios/dashboard → consultar métricas
```

---

## Licença

Tech Challenge — Pós-Tech SOAT FIAP
