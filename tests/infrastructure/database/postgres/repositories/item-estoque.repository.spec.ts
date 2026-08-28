import { Pool } from 'pg';
import { PostgresPecaRepository } from '@infrastructure/database/postgres/repositories/peca.repository.impl';
import { PostgresItemEstoqueRepository } from '@infrastructure/database/postgres/repositories/item-estoque.repository.impl';
import { Peca } from '@domain/entities/peca.entity';
import { ItemEstoque } from '@domain/entities/item-estoque.entity';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../../../../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

let pool: Pool;
let repo: PostgresItemEstoqueRepository;
let pecaRepo: PostgresPecaRepository;
let pecaId: string;

beforeAll(async () => {
  pool = await startTestDatabase();
  repo = new PostgresItemEstoqueRepository(pool);
  pecaRepo = new PostgresPecaRepository(pool);
});

beforeEach(async () => {
  const peca = Peca.create({
    codigo: 'PC-ESTOQUE',
    descricao: 'Peça para teste de estoque',
    categoria: 'MOTOR',
    precoCompra: 10,
    precoVenda: 20,
    unidadeMedida: 'UNIDADE',
    nivelMinimo: 5,
    nivelMaximo: 50,
  });
  await pecaRepo.save(peca);
  pecaId = peca.id;
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

function makeItem(overrides: Partial<{ quantidadeDisponivel: number; quantidadeReservada: number }> = {}): ItemEstoque {
  return ItemEstoque.create({
    pecaId,
    quantidadeDisponivel: overrides.quantidadeDisponivel ?? 20,
    quantidadeReservada: overrides.quantidadeReservada ?? 0,
    nivelMinimo: 5,
    nivelMaximo: 100,
  });
}

describe('PostgresItemEstoqueRepository (integration com PostgreSQL real via Testcontainers)', () => {
  it('save + findByPecaId — persiste e recupera', async () => {
    const item = makeItem();
    await repo.save(item);

    const found = await repo.findByPecaId(pecaId);
    expect(found?.quantidadeDisponivel).toBe(20);
    expect(found?.quantidadeReservada).toBe(0);
  });

  it('findByPecaId — retorna null quando não encontrado', async () => {
    expect(await repo.findByPecaId('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('peca_id duplicado viola a constraint UNIQUE (1:1 com pecas)', async () => {
    await repo.save(makeItem());
    await expect(repo.save(makeItem())).rejects.toThrow();
  });

  it('CHECK constraint impede quantidade_disponivel negativa via UPDATE direto', async () => {
    const item = makeItem();
    await repo.save(item);

    await expect(
      pool.query('UPDATE itens_estoque SET quantidade_disponivel = -1 WHERE peca_id = $1', [
        pecaId,
      ]),
    ).rejects.toThrow();
  });

  it('update — sobrescreve as quantidades (mesmo efeito do findByIdAndUpdate do Mongo)', async () => {
    const item = makeItem();
    await repo.save(item);

    const utilizado = item.reservar(5);
    await repo.update(utilizado);

    const found = await repo.findByPecaId(pecaId);
    expect(found?.quantidadeDisponivel).toBe(15);
    expect(found?.quantidadeReservada).toBe(5);
  });

  it('list — filtra abaixo do mínimo', async () => {
    await repo.save(makeItem({ quantidadeDisponivel: 20 }));

    const abaixoMinimo = await repo.list({ abaixoMinimo: true });
    const todos = await repo.list();
    expect(abaixoMinimo).toHaveLength(0);
    expect(todos).toHaveLength(1);
  });

  describe('reservar (atômico, sem SELECT prévio)', () => {
    it('reserva quando há estoque suficiente', async () => {
      await repo.save(makeItem({ quantidadeDisponivel: 20 }));

      const result = await repo.reservar(pecaId, 5);

      expect(result.quantidadeDisponivel).toBe(15);
      expect(result.quantidadeReservada).toBe(5);
    });

    it('rejeita quando o estoque é insuficiente, sem alterar a linha', async () => {
      await repo.save(makeItem({ quantidadeDisponivel: 3 }));

      await expect(repo.reservar(pecaId, 5)).rejects.toThrow('Estoque insuficiente');

      const found = await repo.findByPecaId(pecaId);
      expect(found?.quantidadeDisponivel).toBe(3);
      expect(found?.quantidadeReservada).toBe(0);
    });

    it('lança NotFoundError quando a peça não tem item de estoque', async () => {
      await expect(repo.reservar('00000000-0000-0000-0000-000000000000', 1)).rejects.toThrow(
        'ItemEstoque não encontrado',
      );
    });

    it('não perde reservas em concorrência: N chamadas concorrentes nunca deixam o total negativo', async () => {
      await repo.save(makeItem({ quantidadeDisponivel: 10 }));

      // 15 tentativas concorrentes de reservar 1 unidade cada, com apenas 10 disponíveis.
      const attempts = Array.from({ length: 15 }, () =>
        repo.reservar(pecaId, 1).then(
          () => 'ok' as const,
          () => 'rejected' as const,
        ),
      );
      const results = await Promise.all(attempts);

      const succeeded = results.filter((r) => r === 'ok').length;
      expect(succeeded).toBe(10);

      const found = await repo.findByPecaId(pecaId);
      expect(found?.quantidadeDisponivel).toBe(0);
      expect(found?.quantidadeReservada).toBe(10);
    });
  });

  describe('utilizar (atômico, sem SELECT prévio)', () => {
    it('consome quantidade já reservada', async () => {
      await repo.save(makeItem({ quantidadeDisponivel: 10, quantidadeReservada: 5 }));

      const result = await repo.utilizar(pecaId, 3);

      expect(result.quantidadeReservada).toBe(2);
      expect(result.quantidadeDisponivel).toBe(10);
    });

    it('rejeita quando a quantidade reservada é insuficiente', async () => {
      await repo.save(makeItem({ quantidadeDisponivel: 10, quantidadeReservada: 2 }));

      await expect(repo.utilizar(pecaId, 5)).rejects.toThrow('excede o reservado');
    });
  });
});
