import { ItemEstoque } from '@domain/entities/item-estoque.entity';

export interface IItemEstoqueRepository {
  save(item: ItemEstoque): Promise<void>;
  findByPecaId(pecaId: string): Promise<ItemEstoque | null>;
  update(item: ItemEstoque): Promise<void>;
  /**
   * Operações **atômicas** (uma instrução condicional no banco): seguras sob
   * concorrência. Lançam `ValidationError` se não houver saldo suficiente.
   */
  reservar(pecaId: string, quantidade: number): Promise<ItemEstoque>;
  utilizar(pecaId: string, quantidade: number): Promise<ItemEstoque>;
  liberarReserva(pecaId: string, quantidade: number): Promise<ItemEstoque>;
  list(filter?: { abaixoMinimo?: boolean }): Promise<ItemEstoque[]>;
}
