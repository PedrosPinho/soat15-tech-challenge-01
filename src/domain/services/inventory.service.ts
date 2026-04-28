import { ItemEstoque } from '@domain/entities/item-estoque.entity';
import { IItemEstoqueRepository } from '@domain/repositories/item-estoque.repository';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';

export class InventoryService {
  constructor(private readonly repo: IItemEstoqueRepository) {}

  async reservarEstoque(pecaId: string, quantidade: number): Promise<ItemEstoque> {
    const item = await this.findOrThrow(pecaId);
    const updated = item.reservar(quantidade);
    await this.repo.update(updated);
    return updated;
  }

  async utilizarEstoque(pecaId: string, quantidade: number): Promise<ItemEstoque> {
    const item = await this.findOrThrow(pecaId);
    const updated = item.utilizar(quantidade);
    await this.repo.update(updated);
    return updated;
  }

  async liberarReserva(pecaId: string, quantidade: number): Promise<ItemEstoque> {
    const item = await this.findOrThrow(pecaId);
    const updated = item.liberarReserva(quantidade);
    await this.repo.update(updated);
    return updated;
  }

  async adicionarEstoque(
    pecaId: string,
    quantidade: number,
    thresholds?: { nivelMinimo: number; nivelMaximo: number },
  ): Promise<ItemEstoque> {
    const existing = await this.repo.findByPecaId(pecaId);

    if (existing) {
      const updated = existing.abastecer(quantidade);
      await this.repo.update(updated);
      return updated;
    }

    if (!thresholds) {
      throw new ValidationError('nivelMinimo e nivelMaximo são obrigatórios para criar um novo item de estoque');
    }

    const newItem = ItemEstoque.create({
      pecaId,
      quantidadeDisponivel: quantidade,
      nivelMinimo: thresholds.nivelMinimo,
      nivelMaximo: thresholds.nivelMaximo,
    });
    await this.repo.save(newItem);
    return newItem;
  }

  async getEstoque(pecaId: string): Promise<ItemEstoque> {
    return this.findOrThrow(pecaId);
  }

  private async findOrThrow(pecaId: string): Promise<ItemEstoque> {
    const item = await this.repo.findByPecaId(pecaId);
    if (!item) throw new NotFoundError(`ItemEstoque não encontrado para a peça ${pecaId}`);
    return item;
  }
}
