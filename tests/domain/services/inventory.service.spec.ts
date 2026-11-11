import { InventoryService } from '@domain/services/inventory.service';
import { IItemEstoqueRepository } from '@domain/repositories/item-estoque.repository';
import { ItemEstoque } from '@domain/entities/item-estoque.entity';
import { NotFoundError } from '@shared/errors/domain.error';

function makeItem(overrides: Partial<{
  quantidadeDisponivel: number;
  quantidadeReservada: number;
}> = {}): ItemEstoque {
  return ItemEstoque.create({
    pecaId: 'peca-1',
    quantidadeDisponivel: overrides.quantidadeDisponivel ?? 20,
    quantidadeReservada: overrides.quantidadeReservada ?? 0,
    nivelMinimo: 5,
    nivelMaximo: 100,
  });
}

function makeRepo(item: ItemEstoque | null = makeItem()): IItemEstoqueRepository {
  return {
    save: jest.fn(),
    findByPecaId: jest.fn().mockResolvedValue(item),
    update: jest.fn(),
    list: jest.fn().mockResolvedValue([]),
    reservar: jest.fn(),
    utilizar: jest.fn(),
    liberarReserva: jest.fn(),
  };
}

describe('InventoryService', () => {
  // reservar/utilizar/liberar delegam às operações atômicas do repositório
  // (uma instrução condicional no banco) — sem read-modify-write em memória.
  describe.each([
    ['reservarEstoque', 'reservar'],
    ['utilizarEstoque', 'utilizar'],
    ['liberarReserva', 'liberarReserva'],
  ] as const)('%s', (metodo, operacao) => {
    it(`delega a ${operacao} atômica do repositório`, async () => {
      const repo = makeRepo();
      const esperado = makeItem();
      (repo[operacao] as jest.Mock).mockResolvedValue(esperado);
      const service = new InventoryService(repo);

      const result = await service[metodo]('peca-1', 5);

      expect(result).toBe(esperado);
      expect(repo[operacao]).toHaveBeenCalledWith('peca-1', 5);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('propaga NotFound/saldo insuficiente do repositório', async () => {
      const repo = makeRepo();
      (repo[operacao] as jest.Mock).mockRejectedValue(new NotFoundError('sem item'));
      await expect(new InventoryService(repo)[metodo]('ghost', 1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('adicionarEstoque', () => {
    it('adds stock to disponivel and persists', async () => {
      const item = makeItem({ quantidadeDisponivel: 10 });
      const repo = makeRepo(item);
      const service = new InventoryService(repo);

      const result = await service.adicionarEstoque('peca-1', 15);

      expect(result.quantidadeDisponivel).toBe(25);
      expect(repo.update).toHaveBeenCalledWith(result);
    });

    it('creates a new ItemEstoque when none exists for that peca', async () => {
      const repo = makeRepo(null);
      const service = new InventoryService(repo);

      const result = await service.adicionarEstoque('peca-1', 10, { nivelMinimo: 3, nivelMaximo: 50 });

      expect(result.quantidadeDisponivel).toBe(10);
      expect(repo.save).toHaveBeenCalledWith(result);
    });

    it('throws when creating new stock without threshold params', async () => {
      const repo = makeRepo(null);
      const service = new InventoryService(repo);

      await expect(service.adicionarEstoque('peca-1', 10)).rejects.toThrow('nivelMinimo e nivelMaximo são obrigatórios para criar um novo item de estoque');
    });
  });

  describe('getEstoque', () => {
    it('returns the current item estoque', async () => {
      const item = makeItem({ quantidadeDisponivel: 12 });
      const repo = makeRepo(item);
      const service = new InventoryService(repo);

      const result = await service.getEstoque('peca-1');

      expect(result).toBe(item);
    });

    it('throws NotFoundError when item not found', async () => {
      const repo = makeRepo(null);
      const service = new InventoryService(repo);

      await expect(service.getEstoque('ghost')).rejects.toThrow(NotFoundError);
    });
  });
});
