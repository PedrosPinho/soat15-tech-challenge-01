import { CategoriaPeca, Peca, UnidadeMedida } from '@domain/entities/peca.entity';

export interface PecaRow {
  id: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaPeca;
  unidade_medida: UnidadeMedida;
  preco_compra: string;
  preco_venda: string;
  nivel_minimo: number;
  nivel_maximo: number;
  ativo: boolean;
}

export const toDomainPeca = (row: PecaRow): Peca =>
  Peca.create({
    id: row.id,
    codigo: row.codigo,
    descricao: row.descricao,
    categoria: row.categoria,
    unidadeMedida: row.unidade_medida,
    precoCompra: Number(row.preco_compra),
    precoVenda: Number(row.preco_venda),
    nivelMinimo: row.nivel_minimo,
    nivelMaximo: row.nivel_maximo,
    ativo: row.ativo,
  });
