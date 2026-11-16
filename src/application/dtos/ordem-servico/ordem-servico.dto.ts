import { StatusOS } from '@domain/entities/ordem-servico.entity';

export interface CreatePecaUtilizadaDto {
  pecaId: string;
  quantidade: number;
}

export interface CreateCatalogoServicoItemDto {
  catalogoServicoId: string;
  pecasUtilizadas?: CreatePecaUtilizadaDto[];
}

export interface CreateOrdemServicoDto {
  cpfCnpj: string;
  placa: string;
  quilometragemEntrada: number;
  observacoes?: string;
  catalogoServicos?: CreateCatalogoServicoItemDto[];
}

export interface PecaServicoResponseDto {
  descricao: string;
  quantidade: number;
  precoUnitario: number;
}

export interface ServicoResponseDto {
  id: string;
  descricao: string;
  tempoEstimadoMinutos: number;
  tempoRealMinutos?: number;
  valorMaoDeObra: number;
  valorTotalPecas: number;
  valorTotal: number;
  pecasUtilizadas: PecaServicoResponseDto[];
  observacoes?: string;
}

export interface OrdemServicoResponseDto {
  id: string;
  numeroOS: string;
  cpfCnpj: string;
  placa: string;
  quilometragemEntrada: number;
  status: StatusOS;
  dataAbertura: string;
  dataInicio?: string;
  dataConclusao?: string;
  observacoes?: string;
  motivoCancelamento?: string;
  temPagamento: boolean;
  servicos: ServicoResponseDto[];
  valorTotal: number;
}

export interface ListOrdensServicoDto {
  page?: number;
  limit?: number;
  status?: StatusOS;
  clienteId?: string;
  veiculoId?: string;
}

export interface ListOrdensServicoResponseDto {
  ordens: OrdemServicoResponseDto[];
  total: number;
  page: number;
  limit: number;
}
