import { ItemEstoque } from '@domain/entities/item-estoque.entity';

export interface ItemEstoqueRow {
  id: string;
  peca_id: string;
  quantidade_disponivel: number;
  quantidade_reservada: number;
  quantidade_minima: number;
  quantidade_maxima: number;
  criado_em: Date;
  atualizado_em: Date;
}

export const toDomainItemEstoque = (row: ItemEstoqueRow): ItemEstoque =>
  ItemEstoque.create({
    id: row.id,
    pecaId: row.peca_id,
    quantidadeDisponivel: row.quantidade_disponivel,
    quantidadeReservada: row.quantidade_reservada,
    nivelMinimo: row.quantidade_minima,
    nivelMaximo: row.quantidade_maxima,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  });
