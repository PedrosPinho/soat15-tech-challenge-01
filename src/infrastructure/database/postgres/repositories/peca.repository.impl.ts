import { Pool } from 'pg';
import { Peca } from '@domain/entities/peca.entity';
import {
  IPecaRepository,
  ListPecasFilter,
  ListPecasResult,
} from '@domain/repositories/peca.repository';
import { getPool } from '../pool';
import { PecaRow, toDomainPeca } from '../mappers/peca.mapper';

export class PostgresPecaRepository implements IPecaRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(peca: Peca): Promise<void> {
    await this.pool.query(
      `INSERT INTO pecas (
        id, codigo, descricao, categoria, unidade_medida,
        preco_compra, preco_venda, nivel_minimo, nivel_maximo, ativo
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        peca.id,
        peca.codigo,
        peca.descricao,
        peca.categoria,
        peca.unidadeMedida,
        peca.precoCompra,
        peca.precoVenda,
        peca.nivelMinimo,
        peca.nivelMaximo,
        peca.ativo,
      ],
    );
  }

  async findById(id: string): Promise<Peca | null> {
    const { rows } = await this.pool.query<PecaRow>('SELECT * FROM pecas WHERE id = $1', [id]);
    return rows[0] ? toDomainPeca(rows[0]) : null;
  }

  async findByCodigo(codigo: string): Promise<Peca | null> {
    const { rows } = await this.pool.query<PecaRow>('SELECT * FROM pecas WHERE codigo = $1', [
      codigo,
    ]);
    return rows[0] ? toDomainPeca(rows[0]) : null;
  }

  async list(page: number, limit: number, filter?: ListPecasFilter): Promise<ListPecasResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.categoria) {
      params.push(filter.categoria);
      conditions.push(`categoria = $${params.length}`);
    }
    if (filter?.ativo !== undefined) {
      params.push(filter.ativo);
      conditions.push(`ativo = $${params.length}`);
    }
    if (filter?.search) {
      params.push(filter.search);
      conditions.push(`to_tsvector('portuguese', descricao) @@ plainto_tsquery('portuguese', $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const listParams = [...params, limit, offset];
    const { rows } = await this.pool.query<PecaRow>(
      `SELECT * FROM pecas ${where} ORDER BY codigo ASC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM pecas ${where}`,
      params,
    );

    return { pecas: rows.map(toDomainPeca), total: Number(countResult.rows[0].count) };
  }

  async update(peca: Peca): Promise<void> {
    await this.pool.query(
      `UPDATE pecas SET
        codigo = $2, descricao = $3, categoria = $4, unidade_medida = $5,
        preco_compra = $6, preco_venda = $7, nivel_minimo = $8, nivel_maximo = $9,
        ativo = $10, atualizado_em = now()
       WHERE id = $1`,
      [
        peca.id,
        peca.codigo,
        peca.descricao,
        peca.categoria,
        peca.unidadeMedida,
        peca.precoCompra,
        peca.precoVenda,
        peca.nivelMinimo,
        peca.nivelMaximo,
        peca.ativo,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('UPDATE pecas SET ativo = false, atualizado_em = now() WHERE id = $1', [
      id,
    ]);
  }
}
