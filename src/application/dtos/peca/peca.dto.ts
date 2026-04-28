import { CategoriaPeca, UnidadeMedida } from '@domain/entities/peca.entity';

export interface CreatePecaDto {
  codigo: string;
  descricao: string;
  categoria: CategoriaPeca;
  precoCompra: number;
  precoVenda: number;
  unidadeMedida: UnidadeMedida;
  nivelMinimo: number;
  nivelMaximo: number;
}

export interface UpdatePecaDto {
  precoCompra: number;
  precoVenda: number;
  nivelMinimo?: number;
  nivelMaximo?: number;
}

export interface ListPecasDto {
  page?: number;
  limit?: number;
  categoria?: CategoriaPeca;
  search?: string;
}

export interface PecaResponseDto {
  id: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaPeca;
  precoCompra: number;
  precoVenda: number;
  margemLucro: number;
  unidadeMedida: UnidadeMedida;
  nivelMinimo: number;
  nivelMaximo: number;
  ativo: boolean;
}

export interface ListPecasResponseDto {
  pecas: PecaResponseDto[];
  total: number;
  page: number;
  limit: number;
}
