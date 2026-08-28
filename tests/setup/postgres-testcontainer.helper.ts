import path from 'path';
import { execFileSync } from 'child_process';
import { Pool } from 'pg';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | undefined;
let pool: Pool | undefined;

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  '../../src/infrastructure/database/postgres/migrations',
);

// `node-pg-migrate` (a partir da v9) é distribuído como pacote ESM puro
// (`"type": "module"`), incompatível com o `require()` do Jest/ts-jest
// configurado para CommonJS neste projeto. Em vez de programaticamente
// importar `runner()`, invocamos o binário da CLI como subprocesso — é
// também o mesmo mecanismo usado em produção (`npm run db:migrate`, rodado
// como Job/initContainer do K8s antes do rollout, conforme o plano da
// Fase 3), então o teste exercita o caminho real de aplicação de migrations.
const MIGRATE_BIN = path.resolve(
  __dirname,
  '../../node_modules/node-pg-migrate/bin/node-pg-migrate.js',
);

const runMigrations = (connectionString: string): void => {
  execFileSync(
    process.execPath,
    [MIGRATE_BIN, 'up', '-m', MIGRATIONS_DIR, '--migrations-table', 'pgmigrations'],
    {
      env: { ...process.env, DATABASE_URL: connectionString },
      stdio: 'pipe',
    },
  );
};

/**
 * Sobe um container PostgreSQL 16 real (Testcontainers), aplica as migrations
 * de `src/infrastructure/database/postgres/migrations` e devolve um `Pool`
 * pronto para uso — mesma responsabilidade de `connectTestDatabase()` do
 * helper do mongodb-memory-server, trocando o container.
 */
export const startTestDatabase = async (): Promise<Pool> => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('oficina_test')
    .withUsername('oficina')
    .withPassword('senha123')
    .start();

  const connectionString = container.getConnectionUri();
  runMigrations(connectionString);

  pool = new Pool({ connectionString });
  return pool;
};

/** Limpa todas as tabelas dos agregados simples entre testes. */
export const clearTestDatabase = async (): Promise<void> => {
  if (!pool) return;
  await pool.query(
    'TRUNCATE TABLE itens_estoque, veiculos, clientes, pecas, catalogo_servicos, usuarios RESTART IDENTITY CASCADE',
  );
};

export const stopTestDatabase = async (): Promise<void> => {
  await pool?.end();
  await container?.stop();
  pool = undefined;
  container = undefined;
};

export const getTestPool = (): Pool => {
  if (!pool) throw new Error('Test database (Testcontainers) não foi iniciado');
  return pool;
};
