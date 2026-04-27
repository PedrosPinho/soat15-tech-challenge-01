# Quick Start Code Examples

Este documento contém templates e exemplos de código prontos para uso no início da implementação.

## 📁 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": "./src",
    "paths": {
      "@domain/*": ["domain/*"],
      "@application/*": ["application/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@presentation/*": ["presentation/*"],
      "@shared/*": ["shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

## 📁 .eslintrc.json

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "plugins": ["@typescript-eslint"],
  "env": {
    "node": true,
    "es2022": true,
    "jest": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

## 📁 .prettierrc

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

## 📁 jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  verbose: true,
};
```

## 📁 .env.example

```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Database
MONGODB_URI=mongodb://localhost:27017/oficina
MONGODB_USER=admin
MONGODB_PASSWORD=senha123
MONGODB_DB_NAME=oficina

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1d
BCRYPT_ROUNDS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 📁 Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

## 📁 docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: oficina-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: senha123
      MONGO_INITDB_DATABASE: oficina
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
    networks:
      - oficina-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: oficina-api
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:senha123@mongodb:27017/oficina?authSource=admin
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - oficina-network
    volumes:
      - ./logs:/app/logs

volumes:
  mongodb_data:
    driver: local

networks:
  oficina-network:
    driver: bridge
```

## 📁 .dockerignore

```
node_modules
npm-debug.log
dist
coverage
.env
.env.local
.git
.gitignore
README.md
docs
tests
*.md
.vscode
.idea
```

## 📁 package.json (Scripts Section)

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only --ignore-watch node_modules src/index.ts",
    "dev:watch": "ts-node-dev --respawn --transpile-only --ignore-watch node_modules --watch src src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist coverage",
    "db:seed": "ts-node src/infrastructure/database/seeds/index.ts",
    "db:reset": "ts-node src/infrastructure/database/seeds/reset.ts",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  }
}
```

## 📁 src/index.ts (Entry Point)

```typescript
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from '@infrastructure/database/mongodb/connection';
import { errorHandler } from '@presentation/middlewares/error.middleware';
import { healthRouter } from '@presentation/routes/health.routes';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRouter);
// TODO: Add more routes here

// Error handling
app.use(errorHandler);

// Database connection and server start
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

startServer();
```

## 📁 src/infrastructure/database/mongodb/connection.ts

```typescript
import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
```

## 📁 src/presentation/controllers/health.controller.ts

```typescript
import { Request, Response } from 'express';
import mongoose from 'mongoose';

export class HealthController {
  async check(req: Request, res: Response): Promise<void> {
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      mongodb: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    };

    const statusCode = health.mongodb === 'CONNECTED' ? 200 : 503;
    res.status(statusCode).json(health);
  }
}
```

## 📁 src/presentation/routes/health.routes.ts

```typescript
import { Router } from 'express';
import { HealthController } from '@presentation/controllers/health.controller';

export const healthRouter = Router();
const healthController = new HealthController();

healthRouter.get('/', (req, res) => healthController.check(req, res));
```

## 📁 src/presentation/middlewares/error.middleware.ts

```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
```

## 📁 Example: Cliente Entity (Domain Layer)

```typescript
// src/domain/entities/cliente.entity.ts
import { CpfCnpj } from '@domain/value-objects/cpf-cnpj.vo';
import { Endereco } from '@domain/value-objects/endereco.vo';
import { v4 as uuidv4 } from 'uuid';

export enum ClienteTipo {
  PESSOA_FISICA = 'PESSOA_FISICA',
  PESSOA_JURIDICA = 'PESSOA_JURIDICA',
}

export interface ClienteProps {
  id?: string;
  nome: string;
  cpfCnpj: string;
  tipo: ClienteTipo;
  telefone: string;
  email: string;
  endereco: Endereco;
  dataCadastro?: Date;
  ativo?: boolean;
}

export class Cliente {
  private constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly cpfCnpj: CpfCnpj,
    public readonly tipo: ClienteTipo,
    public readonly telefone: string,
    public readonly email: string,
    public readonly endereco: Endereco,
    public readonly dataCadastro: Date,
    public readonly ativo: boolean,
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.nome.length < 3 || this.nome.length > 100) {
      throw new Error('Nome must be between 3 and 100 characters');
    }

    if (!this.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Invalid email format');
    }

    if (!this.telefone.match(/^\d{10,11}$/)) {
      throw new Error('Invalid phone number');
    }
  }

  static create(props: ClienteProps): Cliente {
    return new Cliente(
      props.id || uuidv4(),
      props.nome,
      CpfCnpj.create(props.cpfCnpj),
      props.tipo,
      props.telefone,
      props.email,
      props.endereco,
      props.dataCadastro || new Date(),
      props.ativo ?? true,
    );
  }

  desativar(): Cliente {
    return new Cliente(
      this.id,
      this.nome,
      this.cpfCnpj,
      this.tipo,
      this.telefone,
      this.email,
      this.endereco,
      this.dataCadastro,
      false,
    );
  }
}
```

## 📁 Example: CPF/CNPJ Value Object

```typescript
// src/domain/value-objects/cpf-cnpj.vo.ts
export class CpfCnpj {
  private constructor(public readonly value: string) {
    this.validate();
  }

  private validate(): void {
    const cleaned = this.value.replace(/\D/g, '');

    if (cleaned.length === 11) {
      this.validateCpf(cleaned);
    } else if (cleaned.length === 14) {
      this.validateCnpj(cleaned);
    } else {
      throw new Error('Invalid CPF/CNPJ length');
    }
  }

  private validateCpf(cpf: string): void {
    // CPF validation algorithm
    let sum = 0;
    let remainder;

    if (cpf === '00000000000') throw new Error('Invalid CPF');

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) {
      throw new Error('Invalid CPF checksum');
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) {
      throw new Error('Invalid CPF checksum');
    }
  }

  private validateCnpj(cnpj: string): void {
    // CNPJ validation algorithm
    if (cnpj === '00000000000000') throw new Error('Invalid CNPJ');

    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    const digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) {
      throw new Error('Invalid CNPJ checksum');
    }

    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) {
      throw new Error('Invalid CNPJ checksum');
    }
  }

  static create(value: string): CpfCnpj {
    return new CpfCnpj(value);
  }

  get formatted(): string {
    const cleaned = this.value.replace(/\D/g, '');

    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  }
}
```

## 📁 Example: Test File

```typescript
// tests/domain/value-objects/cpf-cnpj.vo.spec.ts
import { CpfCnpj } from '@domain/value-objects/cpf-cnpj.vo';

describe('CpfCnpj Value Object', () => {
  describe('CPF validation', () => {
    it('should create valid CPF', () => {
      const cpf = CpfCnpj.create('12345678909');
      expect(cpf.value).toBe('12345678909');
    });

    it('should format CPF correctly', () => {
      const cpf = CpfCnpj.create('12345678909');
      expect(cpf.formatted).toBe('123.456.789-09');
    });

    it('should throw error for invalid CPF', () => {
      expect(() => CpfCnpj.create('12345678900')).toThrow('Invalid CPF checksum');
    });

    it('should throw error for all zeros CPF', () => {
      expect(() => CpfCnpj.create('00000000000')).toThrow('Invalid CPF');
    });
  });

  describe('CNPJ validation', () => {
    it('should create valid CNPJ', () => {
      const cnpj = CpfCnpj.create('11222333000181');
      expect(cnpj.value).toBe('11222333000181');
    });

    it('should format CNPJ correctly', () => {
      const cnpj = CpfCnpj.create('11222333000181');
      expect(cnpj.formatted).toBe('11.222.333/0001-81');
    });

    it('should throw error for invalid CNPJ', () => {
      expect(() => CpfCnpj.create('11222333000180')).toThrow('Invalid CNPJ checksum');
    });
  });

  describe('Invalid input', () => {
    it('should throw error for invalid length', () => {
      expect(() => CpfCnpj.create('123')).toThrow('Invalid CPF/CNPJ length');
    });
  });
});
```

---

## 🚀 Como Usar Estes Templates

1. **Copie os arquivos de configuração** (tsconfig, eslint, prettier, jest) para a raiz do projeto
2. **Copie o docker-compose.yml** e **Dockerfile** para a raiz
3. **Crie a estrutura de pastas** conforme mostrado
4. **Copie os códigos de exemplo** para os locais apropriados
5. **Execute** `npm install` para instalar as dependências
6. **Execute** `npm run dev` para testar

**Todos os exemplos seguem os padrões definidos em AGENTS.md e domain_model.md!**

---

**Última Atualização**: 2024-04-27  
**Compatível com**: Node.js 20+, TypeScript 5+, MongoDB 7+
