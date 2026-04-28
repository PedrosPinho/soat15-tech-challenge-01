import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';

export interface ListOrdemServicoFilter {
  status?: StatusOS;
  clienteId?: string;
  veiculoId?: string;
}

export interface ListOrdemServicoResult {
  ordens: OrdemServico[];
  total: number;
}

export interface IOrdemServicoRepository {
  save(os: OrdemServico): Promise<void>;
  findById(id: string): Promise<OrdemServico | null>;
  findByNumeroOS(numeroOS: string): Promise<OrdemServico | null>;
  findByClienteId(clienteId: string, page: number, limit: number): Promise<ListOrdemServicoResult>;
  list(
    page: number,
    limit: number,
    filter?: ListOrdemServicoFilter,
  ): Promise<ListOrdemServicoResult>;
  update(os: OrdemServico): Promise<void>;
  nextSequence(dateKey: string): Promise<number>;
}
