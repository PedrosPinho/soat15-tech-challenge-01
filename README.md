# Auto Repair Shop Management System — MVP

Sistema integrado de gestão para oficinas mecânicas, desenvolvido com Domain-Driven Design (DDD) e arquitetura em camadas.

## 📋 Visão Geral

Este projeto implementa um sistema completo para gerenciamento de oficinas mecânicas, cobrindo desde o cadastro de clientes e veículos até a execução de serviços, controle de estoque de peças e registro de pagamentos.

**Fase Atual**: MVP (Minimum Viable Product) - Phase 1

### Principais Funcionalidades

- ✅ **Gestão de Clientes**: Cadastro de pessoas físicas (CPF) e jurídicas (CNPJ) com validação
- ✅ **Gestão de Veículos**: Registro com validação de placa brasileira (Mercosul e formato antigo)
- ✅ **Catálogo de Peças**: Gestão de peças com controle de preços e margens
- ✅ **Controle de Estoque**: Rastreamento de disponibilidade, reserva e utilização de peças
- ✅ **Ordens de Serviço**: Fluxo completo desde criação até conclusão
- ✅ **Registro de Pagamentos**: Múltiplas formas de pagamento
- ✅ **Relatórios**: Dashboard com métricas e histórico de serviços

## 🏗️ Arquitetura

### Stack Tecnológico

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Express.js
- **Database**: MongoDB 7+ (com Mongoose ODM)
- **Testing**: Jest + Supertest
- **API Docs**: Swagger/OpenAPI 3.0
- **Container**: Docker + Docker Compose
- **Security**: JWT, bcrypt, helmet, rate limiting

### Estrutura em Camadas

```
src/
├── presentation/       # API REST (controllers, routes, middlewares)
├── application/        # Use cases & DTOs
├── domain/            # Entidades, value objects, regras de negócio
├── infrastructure/    # Implementações (DB, segurança, logs)
└── shared/           # Utilidades compartilhadas
```

**Princípios DDD Aplicados**:
- Aggregate Roots (Cliente, OrdemServico, Peça)
- Value Objects (CPF/CNPJ, Placa, Endereço)
- Repository Pattern (interfaces no domínio, implementações na infra)
- Domain Events (preparado para event sourcing)

### Bounded Contexts (MVP Simplificado)

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│ Atendimento │────▶│   Execução   │────▶│Financeiro│
│ (Cliente &  │     │  (Ordem de   │     │(Pagamento)│
│  Veículo)   │     │   Serviço)   │     │          │
└─────────────┘     └──────┬───────┘     └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Estoque    │
                    │   (Peças)    │
                    └──────────────┘
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20+ ([Download](https://nodejs.org/))
- Docker Desktop ([Download](https://www.docker.com/products/docker-desktop/))
- Git

### Opção 1: Docker (Recomendado)

```bash
# Clone o repositório
git clone <repository-url>
cd oficina-mecanica

# Copie o arquivo de ambiente
cp .env.example .env

# Inicie todos os serviços
docker-compose up -d

# Aguarde ~30 segundos para inicialização

# Acesse a aplicação
# API: http://localhost:3001
# API Docs: http://localhost:3001/api-docs
# MongoDB: mongodb://localhost:27017/oficina
```

### Opção 2: Local Development

```bash
# Clone o repositório
git clone <repository-url>
cd oficina-mecanica

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite .env com suas configurações

# Inicie o MongoDB via Docker
docker-compose up -d mongodb

# Execute as migrations/seeds (se houver)
npm run db:seed

# Inicie o servidor de desenvolvimento
npm run dev

# Em outro terminal, execute os testes em watch mode
npm run test:watch
```

A aplicação estará disponível em `http://localhost:301`.

## 📚 Documentação

### Documentos do Projeto

- **[Project Summary](docs/project_summary.md)**: Visão geral do negócio, contextos delimitados, eventos de domínio
- **[Domain Model](docs/domain_model.md)**: Especificação detalhada de todas as 21 entidades
- **[Implementation Plan](docs/implementation_plan.md)**: Plano de implementação por fases com tarefas granulares
- **[AGENTS.md](AGENTS.md)**: Guia de desenvolvimento para a equipe

### DDD Artifacts

- **Miro Board**: [Event Storming & Context Map](https://miro.com/app/board/uXjVHcdZiYw=/)
  - Event Storming completo
  - Domain Model (UML)
  - Context Map
  - Linguagem Ubíqua

### API Documentation

Após iniciar a aplicação, acesse:

- **Swagger UI**: http://localhost:301/api-docs
- **OpenAPI JSON**: http://localhost:301/api-docs.json

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Testes com cobertura
npm run test:coverage

# Testes de integração apenas
npm run test:integration

# Testes unitários apenas
npm run test:unit
```

### Metas de Cobertura

- Domain Layer: 90%+
- Application Layer: 85%+
- Presentation Layer: 70%+
- **Overall**: 80%+

## 🔒 Segurança

### Autenticação

Endpoints administrativos requerem autenticação JWT:

```bash
# 1. Login (obter token)
POST /api/auth/login
{
  "email": "admin@oficina.com",
  "password": "senha123"
}

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# 2. Usar token nas requisições
GET /api/clientes
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Validações Implementadas

- ✅ CPF/CNPJ com algoritmo de checksum
- ✅ Placa de veículo (formatos antigo e Mercosul)
- ✅ Email format validation
- ✅ Sanitização de inputs (XSS prevention)
- ✅ Rate limiting (100 req/15min por IP)
- ✅ CORS configurado
- ✅ Helmet security headers

### Análise de Vulnerabilidades

```bash
# NPM Audit
npm audit

# Snyk (se configurado)
snyk test

# Ver relatório completo
cat docs/security_analysis.md
```

## 📊 Modelo de Dados

### Entidades Principais

```typescript
Cliente (Aggregate Root)
├── id: UUID
├── nome: string
├── cpfCnpj: string (unique, validated)
├── tipo: PESSOA_FISICA | PESSOA_JURIDICA
├── telefone: string
├── email: string (unique)
├── endereco: Endereco (value object)
└── veiculos: Veiculo[] (1:*)

Veiculo
├── id: UUID
├── clienteId: UUID
├── placa: string (unique, validated)
├── marca: string
├── modelo: string
├── ano: number
└── quilometragem: number

OrdemServico (Aggregate Root)
├── id: UUID
├── numeroOS: string (auto-generated, unique)
├── clienteId: UUID
├── veiculoId: UUID
├── status: ABERTA | EM_ANDAMENTO | CONCLUIDA | CANCELADA
├── servicos: Servico[] (embedded)
├── valorTotal: number
└── pagamento: Pagamento (1:1)

Peca
├── id: UUID
├── codigo: string (unique, SKU)
├── descricao: string
├── categoria: enum
├── precoCompra: number
├── precoVenda: number
└── quantidadeDisponivel: number
```

Ver modelo completo em [docs/domain_model.md](docs/domain_model.md).

## 🔄 Fluxo de Negócio

### Workflow Principal

```
1. Cliente → Cadastro (POST /api/clientes)
2. Veículo → Cadastro (POST /api/veiculos)
3. Peças → Cadastro no catálogo (POST /api/pecas)
4. Peças → Adicionar estoque (POST /api/pecas/:id/estoque)
5. OS → Criar com serviços e peças (POST /api/ordens-servico)
   ├─ Sistema reserva peças automaticamente
   └─ Calcula valor total
6. OS → Iniciar execução (PATCH /api/ordens-servico/:id/start)
7. OS → Concluir (PATCH /api/ordens-servico/:id/complete)
   └─ Sistema utiliza peças reservadas
8. Pagamento → Registrar (POST /api/ordens-servico/:id/pagamento)
```

### Exemplo de Uso via API

```bash
# 1. Criar cliente
curl -X POST http://localhost:301/api/clientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nome": "João Silva",
    "cpfCnpj": "12345678901",
    "tipo": "PESSOA_FISICA",
    "telefone": "11987654321",
    "email": "joao@email.com",
    "endereco": {
      "logradouro": "Rua A",
      "numero": "123",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01234567"
    }
  }'

# 2. Criar veículo
curl -X POST http://localhost:301/api/veiculos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "clienteId": "<cliente-id>",
    "placa": "ABC1D23",
    "marca": "Honda",
    "modelo": "Civic",
    "ano": 2020,
    "quilometragem": 50000
  }'

# 3. Criar ordem de serviço
curl -X POST http://localhost:301/api/ordens-servico \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "clienteId": "<cliente-id>",
    "veiculoId": "<veiculo-id>",
    "servicos": [
      {
        "descricao": "Troca de óleo",
        "valorMaoObra": 80.00,
        "pecas": [
          {
            "pecaId": "<peca-id>",
            "quantidade": 1
          }
        ]
      }
    ]
  }'
```

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor em modo desenvolvimento
npm run dev:watch        # Inicia com reload automático

# Build
npm run build           # Compila TypeScript para JavaScript
npm run start           # Inicia versão compilada (produção)

# Testes
npm test                # Executa todos os testes
npm run test:watch      # Testes em watch mode
npm run test:coverage   # Testes com relatório de cobertura

# Qualidade de Código
npm run lint            # ESLint
npm run lint:fix        # ESLint com auto-fix
npm run format          # Prettier
npm run type-check      # TypeScript type checking

# Database
npm run db:seed         # Popula banco com dados de exemplo
npm run db:reset        # Limpa e repopula banco

# Docker
docker-compose up       # Inicia todos os serviços
docker-compose down     # Para todos os serviços
docker-compose logs -f  # Visualiza logs em tempo real
```

## 🤝 Contribuindo

### Workflow de Desenvolvimento

1. **Leia a documentação**:
   - `AGENTS.md` - Guia de desenvolvimento
   - `docs/implementation_plan.md` - Tarefas e fases

2. **Crie uma branch**:
   ```bash
   git checkout -b feature/task-1.1-cliente-entity
   ```

3. **Siga TDD**:
   - Escreva testes primeiro
   - Implemente o mínimo para passar
   - Refatore

4. **Quality Gates**:
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run test:coverage
   ```

5. **Commit**:
   ```bash
   git add .
   git commit -m "feat(cliente): implement CPF validation"
   ```

## 📝 Licença

Este projeto é parte do Tech Challenge da Pós-Tech SOAT FIAP.

## 👥 Equipe

- **Grupo**: [Nome do Grupo]
- **Discord**: [Usernames dos participantes]
- **Miro Board**: https://miro.com/app/board/uXjVHcdZiYw=/

## 📞 Suporte

- **Documentação**: Veja `/docs`
- **Issues**: Crie uma issue no repositório
- **Discord**: Canal do Tech Challenge

---

**Versão**: 1.0 (MVP - Phase 1)  
**Última Atualização**: 2024  
**Status**: 🚧 Em Desenvolvimento
