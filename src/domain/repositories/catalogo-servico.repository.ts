import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';

export interface ListCatalogoServicoFilter {
  ativo?: boolean;
  search?: string;
}

export interface ListCatalogoServicoResult {
  servicos: CatalogoServico[];
  total: number;
}

export interface ICatalogoServicoRepository {
  save(servico: CatalogoServico): Promise<void>;
  findById(id: string): Promise<CatalogoServico | null>;
  list(
    page: number,
    limit: number,
    filter?: ListCatalogoServicoFilter,
  ): Promise<ListCatalogoServicoResult>;
  update(servico: CatalogoServico): Promise<void>;
}
