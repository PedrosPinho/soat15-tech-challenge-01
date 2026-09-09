import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';

export interface CatalogoServicoRow {
  id: string;
  descricao: string;
  preco: string;
  tempo_estimado: string;
  ativo: boolean;
}

export const toDomainCatalogoServico = (row: CatalogoServicoRow): CatalogoServico =>
  CatalogoServico.create({
    id: row.id,
    descricao: row.descricao,
    preco: Number(row.preco),
    tempoEstimado: Number(row.tempo_estimado),
    ativo: row.ativo,
  });
