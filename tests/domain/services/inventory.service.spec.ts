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
  };
}

describe('InventoryService', () => {
  describe('reservarEstoque', () => {
    it('reserves stock and persists the updated item', async () => {
      const item = makeItem({ quantidadeDisponivel: 20 });
      const repo = makeRepo(item);
      const service = new InventoryService(repo);

      const result = await service.reservarEstoque('peca-1', 5);

      expect(result.quantidadeDisponivel).toBe(15);
      expect(result.quantidadeReservada).toBe(5);
      expect(repo.update).toHaveBeenCalledWith(result);
    });

    it('throws NotFoundError when item not found', async () => {
      const repo = makeRepo(null);
      const service = new InventoryService(repo);

      await expect(service.reservarEstoque('ghost', 1)).rejects.toThrow(NotFoundError);
    });

    it('propagates insufficient stock error from entity', async () => {
      const item = makeItem({ quantidadeDisponivel: 3 });
      const repo = makeRepo(item);
      const service = new InventoryService(repo);

      await expect(service.reservarEstoque('peca-1', 5)).rejects.toThrow('Estoque insuficiente');
    });
  });

  describe('utilizarEstoque', () => {
    it('utilizes reserved stock and persists', async () => {
      const item = makeItem({ quantidadeDisponivel: 10, quantidadeReservada: 5 });
      const repo = makeRepo(item);
      const service = new InventoryService(repo);

      const result = await service.utilizarEstoque('peca-1', 3);

      expect(result.quantidadeReservada).toBe(2);
      expect(result.quantidadeDisponivel).toBe(10);
      expect(repo.update).toHaveBeenCalledWith(result);
    });

    it('throws NotFoundError when item not found', async () => {
      const repo = makeRepo(null);
      const service = new InventoryService(repo);

      await expect(service.utilizarEstoque('ghost', 1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('liberarReserva', () => {
    it('moves reserved qty back to available and persists', async () => {
      const item = makeItem({ quantidadeDisponivel: 5, quantidadeReservada: 4 });
      const repo = makeRepo(item);
      const service = new InventoryService(repo);

      const result = await service.liberarReserva('peca-1', 2);

      expect(result.quantidadeDisponivel).toBe(7);
      expect(result.quantidadeReservada).toBe(2);
      expect(repo.update).toHaveBeenCalledWith(result);
    });

    it('throws NotFoundError when item not found', async () => {
      const repo = makeRepo(null);
      const service = new InventoryService(repo);

      await expect(service.liberarReserva('ghost', 1)).rejects.toThrow(NotFoundError);
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
