# AGENTS.md — Development Guidelines

## Purpose

This document provides guidance for all developers (human and AI agents) working on this project. It ensures consistency, quality, and alignment with the implementation plan.

## Before You Start

1. **Read these documents in order**:
   - `README.md` - Project overview
   - `docs/project_summary.md` - Business domain understanding
   - `docs/domain_model.md` - Detailed entity specifications
   - `docs/implementation_plan.md` - Your task breakdown

2. **Understand the Tech Stack**:
   - Node.js 20+ with TypeScript 5+
   - MongoDB with Mongoose ODM
   - Express.js for REST APIs
   - Jest for testing
   - Docker for deployment

3. **Know the Architecture**:
   - Layered monolith (Presentation → Application → Domain → Infrastructure)
   - Domain-Driven Design principles
   - Aggregate patterns for consistency boundaries

## Implementation Workflow

### For Each Task

Follow this exact sequence:

1. **Read the Task Specification**
   - Find your task in `docs/implementation_plan.md`
   - Understand acceptance criteria
   - Note which files to create
   - Review what tests are required

2. **Create Tests First (TDD)**
   ```bash
   # Create test file
   touch tests/[layer]/[component].spec.ts
   
   # Write failing tests based on acceptance criteria
   # Run tests (they should fail)
   npm test
   ```

3. **Implement the Feature**
   ```bash
   # Create production files
   # Write minimal code to make tests pass
   # Refactor for clean code
   ```

4. **Run Quality Checks**
   ```bash
   # Type check
   npm run type-check
   
   # Lint
   npm run lint
   
   # Format
   npm run format
   
   # Test with coverage
   npm run test:coverage
   ```

5. **Demo the Feature**
   - Use Postman or curl to demonstrate
   - Show happy path
   - Show validation errors
   - Verify database state

6. **Update Documentation**
   - Add JSDoc comments
   - Update README if needed
   - Add Swagger annotations

7. **Commit**
   ```bash
   git add .
   git commit -m "feat(component): implement feature X"
   ```

## Code Standards

### TypeScript

```typescript
// ✅ GOOD: Explicit types, no any
interface CreateClienteDTO {
  nome: string;
  cpfCnpj: string;
  tipo: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  telefone: string;
  email: string;
}

// ❌ BAD: Using any
function createCliente(data: any) { ... }

// ✅ GOOD: Proper error handling
class ClienteNotFoundError extends Error {
  constructor(id: string) {
    super(`Cliente with id ${id} not found`);
    this.name = 'ClienteNotFoundError';
  }
}

// ❌ BAD: Generic errors
throw new Error('not found');
```

### File Naming

```
domain/entities/cliente.entity.ts          ✅
domain/value-objects/cpf-cnpj.vo.ts       ✅
application/use-cases/create-cliente.use-case.ts  ✅
presentation/controllers/cliente.controller.ts    ✅
tests/domain/entities/cliente.entity.spec.ts      ✅

Cliente.ts                                 ❌ (not descriptive enough)
cliente_entity.ts                          ❌ (use kebab-case)
clienteController.ts                       ❌ (use full word)
```

### Domain Layer Rules

**DO**:
- Pure business logic only
- No framework dependencies (Express, Mongoose, etc.)
- Entities validate themselves
- Value objects are immutable
- Repositories are interfaces

**DON'T**:
- Import from infrastructure layer
- Use console.log (use logger interface)
- Hard-code values (use constants or config)

```typescript
// ✅ GOOD: Domain entity
export class Cliente {
  private constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly cpfCnpj: CpfCnpj, // Value object
    // ...
  ) {
    this.validate();
  }
  
  private validate(): void {
    if (this.nome.length < 3) {
      throw new InvalidClienteError('Nome must be at least 3 characters');
    }
  }
  
  static create(props: ClienteProps): Cliente {
    return new Cliente(
      uuidv4(),
      props.nome,
      CpfCnpj.create(props.cpfCnpj),
      // ...
    );
  }
}

// ❌ BAD: Mongoose in domain
import { Schema, model } from 'mongoose'; // NO!
export class Cliente extends Model { ... } // NO!
```

### Application Layer Rules

**DO**:
- Orchestrate domain operations
- Validate input DTOs
- Map between domain and DTOs
- Handle use case transactions

**DON'T**:
- Business logic (belongs in domain)
- Direct database calls (use repositories)

```typescript
// ✅ GOOD: Use case
export class CreateClienteUseCase {
  constructor(
    private readonly clienteRepository: IClienteRepository,
    private readonly logger: ILogger,
  ) {}
  
  async execute(dto: CreateClienteDTO): Promise<ClienteResponseDTO> {
    // Validate DTO
    this.validateDTO(dto);
    
    // Check business rules
    const exists = await this.clienteRepository.findByCpfCnpj(dto.cpfCnpj);
    if (exists) {
      throw new DuplicateClienteError(dto.cpfCnpj);
    }
    
    // Create domain entity
    const cliente = Cliente.create(dto);
    
    // Persist
    await this.clienteRepository.save(cliente);
    
    // Log
    this.logger.info('Cliente created', { id: cliente.id });
    
    // Return DTO
    return ClienteMapper.toDTO(cliente);
  }
}
```

### Infrastructure Layer Rules

**DO**:
- Implement repository interfaces
- Handle database connections
- Manage external service integrations

```typescript
// ✅ GOOD: Repository implementation
export class MongoClienteRepository implements IClienteRepository {
  async save(cliente: Cliente): Promise<void> {
    const doc = ClienteMapper.toPersistence(cliente);
    await ClienteModel.create(doc);
  }
  
  async findById(id: string): Promise<Cliente | null> {
    const doc = await ClienteModel.findById(id);
    if (!doc) return null;
    return ClienteMapper.toDomain(doc);
  }
}
```

### Testing Standards

```typescript
// ✅ GOOD: Descriptive test names
describe('CpfCnpj Value Object', () => {
  describe('create', () => {
    it('should create valid CPF with 11 digits', () => {
      const cpf = CpfCnpj.create('12345678901');
      expect(cpf.value).toBe('12345678901');
    });
    
    it('should throw error for invalid CPF checksum', () => {
      expect(() => CpfCnpj.create('12345678900')).toThrow(InvalidCpfError);
    });
    
    it('should format CPF with dots and dash', () => {
      const cpf = CpfCnpj.create('12345678901');
      expect(cpf.formatted).toBe('123.456.789-01');
    });
  });
});

// ❌ BAD: Vague test names
it('works', () => { ... });
it('test 1', () => { ... });
```

### API Endpoint Standards

```typescript
// ✅ GOOD: RESTful, validated, documented
/**
 * @swagger
 * /api/clientes:
 *   post:
 *     summary: Create new cliente
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClienteDTO'
 */
router.post(
  '/clientes',
  authMiddleware,
  validateDTO(CreateClienteSchema),
  async (req, res, next) => {
    try {
      const result = await createClienteUseCase.execute(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ❌ BAD: No validation, inconsistent
router.post('/cliente', (req, res) => {  // Missing 's', no auth
  const cliente = new Cliente(req.body);  // No validation
  cliente.save();  // No error handling
  res.send(cliente);  // Wrong status code
});
```

## Common Patterns

### Repository Interface

```typescript
export interface IClienteRepository {
  save(cliente: Cliente): Promise<void>;
  findById(id: string): Promise<Cliente | null>;
  findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null>;
  list(page: number, limit: number): Promise<Cliente[]>;
  update(cliente: Cliente): Promise<void>;
  delete(id: string): Promise<void>;
}
```

### DTO Mapping

```typescript
export class ClienteMapper {
  static toDTO(cliente: Cliente): ClienteResponseDTO {
    return {
      id: cliente.id,
      nome: cliente.nome,
      cpfCnpj: cliente.cpfCnpj.value,
      tipo: cliente.tipo,
      // ...
    };
  }
  
  static toDomain(doc: any): Cliente {
    return Cliente.create({
      id: doc._id.toString(),
      nome: doc.nome,
      cpfCnpj: doc.cpfCnpj,
      // ...
    });
  }
  
  static toPersistence(cliente: Cliente): any {
    return {
      _id: cliente.id,
      nome: cliente.nome,
      cpfCnpj: cliente.cpfCnpj.value,
      // ...
    };
  }
}
```

### Error Handling

```typescript
// Domain errors
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidCpfError extends DomainError {}
export class ClienteNotFoundError extends DomainError {}

// Error middleware
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof DomainError) {
    return res.status(400).json({ error: err.message });
  }
  
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
```

## Environment Setup

### First Time Setup

```bash
# Clone repository
git clone <repo-url>
cd oficina-mecanica

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env

# Start MongoDB (Docker)
docker-compose up -d mongodb

# Run migrations/seeds if any
npm run db:seed

# Run tests
npm test

# Start development server
npm run dev
```

### Daily Development

```bash
# Pull latest
git pull origin develop

# Install new dependencies (if package.json changed)
npm install

# Start database
docker-compose up -d mongodb

# Run in watch mode
npm run dev:watch

# In another terminal, run tests in watch mode
npm run test:watch
```

## Debugging

### VS Code launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug App",
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## Troubleshooting

### MongoDB connection issues

```bash
# Check if MongoDB is running
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb

# Reset database (⚠️ destroys data)
docker-compose down -v
docker-compose up -d
```

### Test failures

```bash
# Run specific test
npm test -- cliente.entity.spec.ts

# Run with verbose output
npm test -- --verbose

# Clear Jest cache
npm test -- --clearCache
```

### TypeScript errors

```bash
# Check all errors
npm run type-check

# Rebuild
rm -rf dist
npm run build
```

## Code Review Checklist

Before submitting code for review:

- [ ] All tests pass (`npm test`)
- [ ] Coverage meets layer target (`npm run test:coverage`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] JSDoc comments on public APIs
- [ ] Swagger annotations on endpoints
- [ ] Environment variables in .env.example
- [ ] Updated README if needed
- [ ] Demo checklist completed

## Resources

### Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Mongoose Docs](https://mongoosejs.com/docs/)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

### Domain-Driven Design
- [DDD Reference](https://www.domainlanguage.com/ddd/reference/)
- [Implementing DDD](https://vaughnvernon.com/resources/)

### Project-Specific
- Miro Board: https://miro.com/app/board/uXjVHcdZiYw=/
- Tech Challenge PDF: `/mnt/project/15SOAT__Fase_1__Tech_Challenge_2.pdf`

## Getting Help

1. **Check documentation first**: README, project_summary, domain_model, implementation_plan
2. **Search existing code**: Similar patterns might already exist
3. **Ask the team**: Use Discord or team chat
4. **Create an issue**: Document the problem for future reference

## Remember

- **Start with tests** - TDD is not optional
- **Follow the plan** - Don't skip tasks or reorder them
- **Demo frequently** - After each task, show it works
- **Ask questions** - Better to ask than to guess
- **Keep it simple** - MVP means minimum, not maximum

---

**Last Updated**: Initial version  
**Next Review**: After Phase 0 completion
