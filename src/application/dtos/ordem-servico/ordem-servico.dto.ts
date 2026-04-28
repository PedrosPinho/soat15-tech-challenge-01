import { StatusOS } from '@domain/entities/ordem-servico.entity';
import { StatusServico } from '@domain/entities/servico.entity';

export interface CreateServicoDto {
  descricao: string;
  tempoEstimadoMinutos: number;
  valorMaoDeObra: number;
  observacoes?: string;
}

export interface CreateOrdemServicoDto {
  clienteId: string;
  veiculoId: string;
  quilometragemEntrada: number;
  observacoes?: string;
  servicos?: CreateServicoDto[];
}

export interface PecaServicoResponseDto {
  pecaId: string;
  quantidade: number;
  precoUnitario: number;
}

export interface ServicoResponseDto {
  id: string;
  descricao: string;
  status: StatusServico;
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
  clienteId: string;
  veiculoId: string;
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
