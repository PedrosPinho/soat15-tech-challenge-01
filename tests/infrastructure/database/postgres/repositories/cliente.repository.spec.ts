import { Pool } from 'pg';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { Cliente } from '@domain/entities/cliente.entity';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../../../../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

let pool: Pool;
let repo: PostgresClienteRepository;

beforeAll(async () => {
  pool = await startTestDatabase();
  repo = new PostgresClienteRepository(pool);
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

let seq = 0;
function makeCliente(overrides: Partial<{ cpfCnpj: string; email: string }> = {}): Cliente {
  seq += 1;
  return Cliente.create({
    nome: 'João Silva',
    cpfCnpj: overrides.cpfCnpj ?? '52998224725',
    tipo: 'PESSOA_FISICA',
    telefone: '11999999999',
    email: overrides.email ?? `joao${seq}@test.com`,
    endereco: {
      logradouro: 'Rua A',
      numero: '1',
      complemento: 'Apto 2',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01000000',
    },
  });
}

describe('PostgresClienteRepository (integration com PostgreSQL real via Testcontainers)', () => {
  it('save + findById — persiste e reconstrói o VO Endereco corretamente', async () => {
    const cliente = makeCliente();
    await repo.save(cliente);

    const found = await repo.findById(cliente.id);

    expect(found).not.toBeNull();
    expect(found?.nome).toBe('João Silva');
    expect(found?.cpfCnpj.value).toBe('52998224725');
    expect(found?.endereco.logradouro).toBe('Rua A');
    expect(found?.endereco.complemento).toBe('Apto 2');
    expect(found?.endereco.bairro).toBe('Centro');
    expect(found?.endereco.estado).toBe('SP');
    expect(found?.endereco.cep).toBe('01000000');
  });

  it('findById — retorna null quando não encontrado', async () => {
    expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('findByCpfCnpj — encontra pelo CPF', async () => {
    const cliente = makeCliente({ cpfCnpj: '11144477735' });
    await repo.save(cliente);

    const found = await repo.findByCpfCnpj('11144477735');
    expect(found?.id).toBe(cliente.id);
  });

  it('findByEmail — normaliza para minúsculas', async () => {
    const cliente = makeCliente({ email: 'MAIUSCULO@test.com' });
    await repo.save(cliente);

    const found = await repo.findByEmail('MAIUSCULO@test.com');
    expect(found?.id).toBe(cliente.id);
  });

  it('cpf_cnpj duplicado viola a constraint UNIQUE', async () => {
    await repo.save(makeCliente({ cpfCnpj: '52998224725', email: 'a@test.com' }));
    await expect(repo.save(makeCliente({ cpfCnpj: '52998224725', email: 'b@test.com' }))).rejects.toThrow();
  });

  it('list — pagina e ordena por nome, considerando apenas ativos', async () => {
    const zeca = makeCliente({ email: 'zeca@test.com' });
    const ana = Cliente.create({
      nome: 'Ana Souza',
      cpfCnpj: '11144477735',
      tipo: 'PESSOA_FISICA',
      telefone: '11999999999',
      email: 'ana@test.com',
      endereco: {
        logradouro: 'Rua B',
        numero: '2',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01000000',
      },
    });
    await repo.save(zeca);
    await repo.save(ana);

    const result = await repo.list(1, 10);
    expect(result.total).toBe(2);
    expect(result.clientes[0].nome).toBe('Ana Souza');
  });

  it('list — não retorna clientes inativos', async () => {
    const cliente = makeCliente();
    await repo.save(cliente);
    await repo.delete(cliente.id);

    const result = await repo.list(1, 10);
    expect(result.total).toBe(0);
  });

  it('update — persiste alterações de contato', async () => {
    const cliente = makeCliente();
    await repo.save(cliente);

    const atualizado = cliente.atualizarContato('11888888888', 'novo@test.com');
    await repo.update(atualizado);

    const found = await repo.findById(cliente.id);
    expect(found?.telefone).toBe('11888888888');
    expect(found?.email).toBe('novo@test.com');
  });

  it('delete — soft delete via ativo=false, não remove a linha', async () => {
    const cliente = makeCliente();
    await repo.save(cliente);

    await repo.delete(cliente.id);

    const { rows } = await pool.query('SELECT ativo FROM clientes WHERE id = $1', [cliente.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ativo).toBe(false);
  });
});
