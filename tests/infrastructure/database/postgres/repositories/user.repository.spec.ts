import { Pool } from 'pg';
import { PostgresUserRepository } from '@infrastructure/database/postgres/repositories/user.repository.impl';
import { User } from '@domain/entities/user.entity';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../../../../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

let pool: Pool;
let repo: PostgresUserRepository;

beforeAll(async () => {
  pool = await startTestDatabase();
  repo = new PostgresUserRepository(pool);
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

function makeUser(overrides: Partial<{ email: string }> = {}): User {
  return User.create({
    nome: 'Admin da Oficina',
    email: overrides.email ?? 'admin@oficina.com',
    senhaHash: 'hash-fake',
    ativo: true,
  });
}

describe('PostgresUserRepository (integration com PostgreSQL real via Testcontainers)', () => {
  it('save + findById — persiste e recupera', async () => {
    const user = makeUser();
    await repo.save(user);

    const found = await repo.findById(user.id);
    expect(found?.nome).toBe('Admin da Oficina');
    expect(found?.senhaHash).toBe('hash-fake');
  });

  it('findByEmail — normaliza para minúsculas', async () => {
    const user = makeUser({ email: 'MAIUSCULO@oficina.com' });
    await repo.save(user);

    const found = await repo.findByEmail('MAIUSCULO@oficina.com');
    expect(found?.id).toBe(user.id);
  });

  it('findByEmail — retorna null quando não encontrado', async () => {
    expect(await repo.findByEmail('ninguem@oficina.com')).toBeNull();
  });

  it('email duplicado viola a constraint UNIQUE', async () => {
    await repo.save(makeUser({ email: 'dup@oficina.com' }));
    await expect(repo.save(makeUser({ email: 'dup@oficina.com' }))).rejects.toThrow();
  });
});
