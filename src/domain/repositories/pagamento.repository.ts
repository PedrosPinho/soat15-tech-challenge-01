import { Pagamento, StatusPagamento } from '@domain/entities/pagamento.entity';

export interface ListPagamentosFilter {
  ordemServicoId?: string;
  status?: StatusPagamento;
}

export interface IFindPagamentosResult {
  pagamentos: Pagamento[];
  total: number;
}

export interface IPagamentoRepository {
  save(pagamento: Pagamento): Promise<void>;
  findById(id: string): Promise<Pagamento | null>;
  findByOrdemServicoId(ordemServicoId: string): Promise<Pagamento[]>;
  list(page: number, limit: number, filter?: ListPagamentosFilter): Promise<IFindPagamentosResult>;
  update(pagamento: Pagamento): Promise<void>;
  sumConfirmados(): Promise<number>;
}
