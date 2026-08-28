import { Pool } from 'pg';
import { Pagamento } from '@domain/entities/pagamento.entity';
import {
  IPagamentoRepository,
  ListPagamentosFilter,
  IFindPagamentosResult,
} from '@domain/repositories/pagamento.repository';
import { ConflictError } from '@shared/errors/domain.error';
import { getPool } from '../pool';
import { PagamentoRow, toDomainPagamento } from '../mappers/pagamento.mapper';

/** Código de erro do Postgres para violação de UNIQUE (inclui índices parciais). */
const UNIQUE_VIOLATION = '23505';

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;

/**
 * Implementa `IPagamentoRepository` sobre PostgreSQL. A regra "no máximo um
 * pagamento CONFIRMADO por OS" (antes garantida só pela flag `temPagamento` na
 * OS) passa a ser um índice único parcial em `pagamentos` — `save()`/`update()`
 * traduzem a violação desse índice em `ConflictError`, em vez de deixar o erro
 * cru do `pg` vazar para a camada de aplicação.
 */
export class PostgresPagamentoRepository implements IPagamentoRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(pagamento: Pagamento): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO pagamentos (
          id, ordem_servico_id, valor, forma_pagamento, status,
          data_pagamento, observacoes, criado_em
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          pagamento.id,
          pagamento.ordemServicoId,
          pagamento.valor,
          pagamento.formaPagamento,
          pagamento.status,
          pagamento.dataPagamento ?? null,
          pagamento.observacoes ?? null,
          pagamento.criadoEm,
        ],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Já existe um pagamento confirmado para esta ordem de serviço');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Pagamento | null> {
    const { rows } = await this.pool.query<PagamentoRow>(
      'SELECT * FROM pagamentos WHERE id = $1',
      [id],
    );
    return rows[0] ? toDomainPagamento(rows[0]) : null;
  }

  async findByOrdemServicoId(ordemServicoId: string): Promise<Pagamento[]> {
    const { rows } = await this.pool.query<PagamentoRow>(
      'SELECT * FROM pagamentos WHERE ordem_servico_id = $1',
      [ordemServicoId],
    );
    return rows.map(toDomainPagamento);
  }

  async list(
    page: number,
    limit: number,
    filter?: ListPagamentosFilter,
  ): Promise<IFindPagamentosResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.ordemServicoId) {
      params.push(filter.ordemServicoId);
      conditions.push(`ordem_servico_id = $${params.length}`);
    }
    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const listParams = [...params, limit, offset];

    const [{ rows }, countResult] = await Promise.all([
      this.pool.query<PagamentoRow>(
        `SELECT * FROM pagamentos ${where}
         ORDER BY criado_em DESC
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      ),
      this.pool.query<{ count: string }>(`SELECT COUNT(*) FROM pagamentos ${where}`, params),
    ]);

    return { pagamentos: rows.map(toDomainPagamento), total: Number(countResult.rows[0].count) };
  }

  async update(pagamento: Pagamento): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE pagamentos SET status = $2, data_pagamento = $3, observacoes = $4 WHERE id = $1`,
        [pagamento.id, pagamento.status, pagamento.dataPagamento ?? null, pagamento.observacoes ?? null],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Já existe um pagamento confirmado para esta ordem de serviço');
      }
      throw error;
    }
  }

  async sumConfirmados(): Promise<number> {
    const { rows } = await this.pool.query<{ total: string | null }>(
      `SELECT SUM(valor) as total FROM pagamentos WHERE status = 'CONFIRMADO'`,
    );
    return Number(rows[0]?.total ?? 0);
  }
}
