import { ItemEstoque } from '@domain/entities/item-estoque.entity';

export interface IItemEstoqueRepository {
  save(item: ItemEstoque): Promise<void>;
  findByPecaId(pecaId: string): Promise<ItemEstoque | null>;
  update(item: ItemEstoque): Promise<void>;
  list(filter?: { abaixoMinimo?: boolean }): Promise<ItemEstoque[]>;
}
