import { FormaPagamento, StatusPagamento } from '@domain/entities/pagamento.entity';

export interface CreatePagamentoDto {
  ordemServicoId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  observacoes?: string;
}

export interface ListPagamentosDto {
  page?: number;
  limit?: number;
  ordemServicoId?: string;
  status?: StatusPagamento;
}

export interface PagamentoResponseDto {
  id: string;
  ordemServicoId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  status: StatusPagamento;
  dataPagamento?: string;
  observacoes?: string;
  criadoEm: string;
}

export interface ListPagamentosResponseDto {
  pagamentos: PagamentoResponseDto[];
  total: number;
  page: number;
  limit: number;
}
