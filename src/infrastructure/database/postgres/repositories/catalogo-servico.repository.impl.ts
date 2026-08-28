import { Pool } from 'pg';
import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';
import {
  ICatalogoServicoRepository,
  ListCatalogoServicoFilter,
  ListCatalogoServicoResult,
} from '@domain/repositories/catalogo-servico.repository';
import { getPool } from '../pool';
import { CatalogoServicoRow, toDomainCatalogoServico } from '../mappers/catalogo-servico.mapper';

export class PostgresCatalogoServicoRepository implements ICatalogoServicoRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(servico: CatalogoServico): Promise<void> {
    await this.pool.query(
      `INSERT INTO catalogo_servicos (id, descricao, preco, tempo_estimado, ativo)
       VALUES ($1,$2,$3,$4,$5)`,
      [servico.id, servico.descricao, servico.preco, servico.tempoEstimado, servico.ativo],
    );
  }

  async findById(id: string): Promise<CatalogoServico | null> {
    const { rows } = await this.pool.query<CatalogoServicoRow>(
      'SELECT * FROM catalogo_servicos WHERE id = $1',
      [id],
    );
    return rows[0] ? toDomainCatalogoServico(rows[0]) : null;
  }

  async list(
    page: number,
    limit: number,
    filter?: ListCatalogoServicoFilter,
  ): Promise<ListCatalogoServicoResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.ativo !== undefined) {
      params.push(filter.ativo);
      conditions.push(`ativo = $${params.length}`);
    }
    if (filter?.search) {
      params.push(filter.search);
      conditions.push(
        `to_tsvector('portuguese', descricao) @@ plainto_tsquery('portuguese', $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const listParams = [...params, limit, offset];

    const { rows } = await this.pool.query<CatalogoServicoRow>(
      `SELECT * FROM catalogo_servicos ${where} ORDER BY descricao ASC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM catalogo_servicos ${where}`,
      params,
    );

    return {
      servicos: rows.map(toDomainCatalogoServico),
      total: Number(countResult.rows[0].count),
    };
  }

  async update(servico: CatalogoServico): Promise<void> {
    await this.pool.query(
      `UPDATE catalogo_servicos SET
        descricao = $2, preco = $3, tempo_estimado = $4, ativo = $5, atualizado_em = now()
       WHERE id = $1`,
      [servico.id, servico.descricao, servico.preco, servico.tempoEstimado, servico.ativo],
    );
  }
}
