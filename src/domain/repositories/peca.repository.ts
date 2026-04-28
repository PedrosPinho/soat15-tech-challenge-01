import { Peca, CategoriaPeca } from '@domain/entities/peca.entity';

export interface ListPecasFilter {
  categoria?: CategoriaPeca;
  ativo?: boolean;
  search?: string;
}

export interface ListPecasResult {
  pecas: Peca[];
  total: number;
}

export interface IPecaRepository {
  save(peca: Peca): Promise<void>;
  findById(id: string): Promise<Peca | null>;
  findByCodigo(codigo: string): Promise<Peca | null>;
  list(page: number, limit: number, filter?: ListPecasFilter): Promise<ListPecasResult>;
  update(peca: Peca): Promise<void>;
  delete(id: string): Promise<void>;
}
