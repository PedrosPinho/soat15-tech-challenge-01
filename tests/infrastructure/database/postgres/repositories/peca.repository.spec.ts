import { Pool } from 'pg';
import { PostgresPecaRepository } from '@infrastructure/database/postgres/repositories/peca.repository.impl';
import { Peca } from '@domain/entities/peca.entity';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../../../../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

let pool: Pool;
let repo: PostgresPecaRepository;

beforeAll(async () => {
  pool = await startTestDatabase();
  repo = new PostgresPecaRepository(pool);
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

let seq = 0;
function makePeca(overrides: Partial<{ codigo: string; descricao: string; categoria: Peca['categoria'] }> = {}): Peca {
  seq += 1;
  return Peca.create({
    codigo: overrides.codigo ?? `PC-${seq}`,
    descricao: overrides.descricao ?? 'Filtro de óleo do motor',
    categoria: overrides.categoria ?? 'FILTROS',
    precoCompra: 10,
    precoVenda: 20,
    unidadeMedida: 'UNIDADE',
    nivelMinimo: 5,
    nivelMaximo: 50,
  });
}

describe('PostgresPecaRepository (integration com PostgreSQL real via Testcontainers)', () => {
  it('save + findById — persiste e recupera todos os campos', async () => {
    const peca = makePeca();
    await repo.save(peca);

    const found = await repo.findById(peca.id);
    expect(found?.codigo).toBe(peca.codigo);
    expect(found?.precoCompra).toBe(10);
    expect(found?.precoVenda).toBe(20);
    expect(found?.categoria).toBe('FILTROS');
    expect(found?.unidadeMedida).toBe('UNIDADE');
  });

  it('findByCodigo — encontra pelo código', async () => {
    const peca = makePeca({ codigo: 'FILTRO-01' });
    await repo.save(peca);

    const found = await repo.findByCodigo('FILTRO-01');
    expect(found?.id).toBe(peca.id);
  });

  it('codigo duplicado viola a constraint UNIQUE', async () => {
    await repo.save(makePeca({ codigo: 'DUP-1' }));
    await expect(repo.save(makePeca({ codigo: 'DUP-1' }))).rejects.toThrow();
  });

  it('list — filtra por categoria', async () => {
    await repo.save(makePeca({ categoria: 'FILTROS' }));
    await repo.save(makePeca({ categoria: 'MOTOR' }));

    const result = await repo.list(1, 10, { categoria: 'MOTOR' });
    expect(result.total).toBe(1);
    expect(result.pecas[0].categoria).toBe('MOTOR');
  });

  it('list — filtra por ativo', async () => {
    const peca = makePeca();
    await repo.save(peca);
    await repo.delete(peca.id);

    const ativos = await repo.list(1, 10, { ativo: true });
    const inativos = await repo.list(1, 10, { ativo: false });
    expect(ativos.total).toBe(0);
    expect(inativos.total).toBe(1);
  });

  it('list — busca textual via índice GIN (to_tsvector)', async () => {
    await repo.save(makePeca({ descricao: 'Pastilha de freio dianteira' }));
    await repo.save(makePeca({ descricao: 'Filtro de óleo do motor' }));

    const result = await repo.list(1, 10, { search: 'pastilha freio' });
    expect(result.total).toBe(1);
    expect(result.pecas[0].descricao).toContain('Pastilha');
  });

  it('update — persiste alteração de preço', async () => {
    const peca = makePeca();
    await repo.save(peca);

    const atualizada = peca.atualizarPreco(15, 30);
    await repo.update(atualizada);

    const found = await repo.findById(peca.id);
    expect(found?.precoCompra).toBe(15);
    expect(found?.precoVenda).toBe(30);
  });

  it('delete — soft delete via ativo=false', async () => {
    const peca = makePeca();
    await repo.save(peca);

    await repo.delete(peca.id);

    const found = await repo.findById(peca.id);
    expect(found?.ativo).toBe(false);
  });
});
