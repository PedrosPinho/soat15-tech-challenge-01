import { ItemEstoque } from '@domain/entities/item-estoque.entity';
import { IItemEstoqueRepository } from '@domain/repositories/item-estoque.repository';
import { ItemEstoqueModel, ItemEstoqueDocument } from '../schemas/item-estoque.schema';

export class MongoItemEstoqueRepository implements IItemEstoqueRepository {
  async save(item: ItemEstoque): Promise<void> {
    await ItemEstoqueModel.create(this.toPersistence(item));
  }

  async findByPecaId(pecaId: string): Promise<ItemEstoque | null> {
    const doc = await ItemEstoqueModel.findOne({ pecaId });
    return doc ? this.toDomain(doc) : null;
  }

  async update(item: ItemEstoque): Promise<void> {
    await ItemEstoqueModel.findByIdAndUpdate(item.id, this.toPersistence(item));
  }

  async list(filter?: { abaixoMinimo?: boolean }): Promise<ItemEstoque[]> {
    const docs = await ItemEstoqueModel.find();
    const items = docs.map((d) => this.toDomain(d));

    if (filter?.abaixoMinimo) {
      return items.filter((item) => item.isAbaixoDoMinimo);
    }
    return items;
  }

  private toDomain(doc: ItemEstoqueDocument): ItemEstoque {
    return ItemEstoque.create({
      id: doc._id as string,
      pecaId: doc.pecaId,
      quantidadeDisponivel: doc.quantidadeDisponivel,
      quantidadeReservada: doc.quantidadeReservada,
      nivelMinimo: doc.nivelMinimo,
      nivelMaximo: doc.nivelMaximo,
      criadoEm: doc.criadoEm,
      atualizadoEm: doc.atualizadoEm,
    });
  }

  private toPersistence(item: ItemEstoque): Record<string, unknown> {
    return {
      _id: item.id,
      pecaId: item.pecaId,
      quantidadeDisponivel: item.quantidadeDisponivel,
      quantidadeReservada: item.quantidadeReservada,
      nivelMinimo: item.nivelMinimo,
      nivelMaximo: item.nivelMaximo,
      criadoEm: item.criadoEm,
      atualizadoEm: item.atualizadoEm,
    };
  }
}
