export interface CreateCatalogoServicoDto {
  descricao: string;
  preco: number;
  tempoEstimado: number;
}

export interface UpdateCatalogoServicoDto {
  descricao?: string;
  preco?: number;
  tempoEstimado?: number;
}

export interface CatalogoServicoResponseDto {
  id: string;
  descricao: string;
  preco: number;
  tempoEstimado: number;
  ativo: boolean;
}

export interface ListCatalogoServicoDto {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListCatalogoServicoResponseDto {
  servicos: CatalogoServicoResponseDto[];
  total: number;
  page: number;
  limit: number;
}
