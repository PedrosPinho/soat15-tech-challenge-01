import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import {
  IOrdemServicoRepository,
  ListOrdemServicoFilter,
  ListOrdemServicoResult,
} from '@domain/repositories/ordem-servico.repository';
import { getPool } from '../pool';
import {
  OrdemServicoRow,
  ServicoOSRow,
  ServicoPecaRow,
  toDomainOrdemServico,
} from '../mappers/ordem-servico.mapper';

const STATUS_ORDER_SQL = `CASE status
  WHEN 'EM_EXECUCAO' THEN 1
  WHEN 'AGUARDANDO_APROVACAO' THEN 2
  WHEN 'EM_DIAGNOSTICO' THEN 3
  WHEN 'RECEBIDA' THEN 4
  ELSE 5
END`;

/**
 * Implementa `IOrdemServicoRepository` sobre PostgreSQL. É o primeiro
 * repositório do projeto a precisar de uma transação real (`BEGIN`/`COMMIT`):
 * como `OrdemServico` é imutável e sempre chega inteira (árvore de 3 níveis:
 * OS -> Servico[] -> pecasUtilizadas[]), `save()`/`update()` gravam a raiz e
 * substituem os filhos (`DELETE`+`INSERT`) atomicamente.
 *
 * `list()`/`findByClienteId()` carregam os filhos em lote (`WHERE ... = ANY($1)`)
 * para uma página inteira de OSes, evitando N+1 — ver `PHASE_3_PLAN.md`.
 */
export class PostgresOrdemServicoRepository implements IOrdemServicoRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(os: OrdemServico): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO ordens_servico (
          id, numero_os, cliente_id, veiculo_id, cpf_cnpj, placa,
          quilometragem_entrada, status, data_abertura, data_inicio,
          data_conclusao, observacoes, motivo_cancelamento, tem_pagamento
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          os.id,
          os.numeroOS,
          os.clienteId,
          os.veiculoId,
          os.cpfCnpj ?? null,
          os.placa ?? null,
          os.quilometragemEntrada,
          os.status,
          os.dataAbertura,
          os.dataInicio ?? null,
          os.dataConclusao ?? null,
          os.observacoes ?? null,
          os.motivoCancelamento ?? null,
          os.temPagamento,
        ],
      );
      await this.insertServicos(client, os);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(os: OrdemServico): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE ordens_servico SET
          status = $2, data_inicio = $3, data_conclusao = $4,
          motivo_cancelamento = $5, tem_pagamento = $6, atualizado_em = now()
         WHERE id = $1`,
        [
          os.id,
          os.status,
          os.dataInicio ?? null,
          os.dataConclusao ?? null,
          os.motivoCancelamento ?? null,
          os.temPagamento,
        ],
      );
      await client.query('DELETE FROM servicos_os WHERE ordem_servico_id = $1', [os.id]);
      await this.insertServicos(client, os);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<OrdemServico | null> {
    const { rows } = await this.pool.query<OrdemServicoRow>(
      'SELECT * FROM ordens_servico WHERE id = $1',
      [id],
    );
    if (!rows[0]) return null;
    const [os] = await this.hydrate([rows[0]]);
    return os;
  }

  async findByNumeroOS(numeroOS: string): Promise<OrdemServico | null> {
    const { rows } = await this.pool.query<OrdemServicoRow>(
      'SELECT * FROM ordens_servico WHERE numero_os = $1',
      [numeroOS],
    );
    if (!rows[0]) return null;
    const [os] = await this.hydrate([rows[0]]);
    return os;
  }

  async findByClienteId(
    clienteId: string,
    page: number,
    limit: number,
  ): Promise<ListOrdemServicoResult> {
    const offset = (page - 1) * limit;
    const [{ rows }, countResult] = await Promise.all([
      this.pool.query<OrdemServicoRow>(
        'SELECT * FROM ordens_servico WHERE cliente_id = $1 ORDER BY data_abertura DESC LIMIT $2 OFFSET $3',
        [clienteId, limit, offset],
      ),
      this.pool.query<{ count: string }>(
        'SELECT COUNT(*) FROM ordens_servico WHERE cliente_id = $1',
        [clienteId],
      ),
    ]);
    return { ordens: await this.hydrate(rows), total: Number(countResult.rows[0].count) };
  }

  async list(
    page: number,
    limit: number,
    filter?: ListOrdemServicoFilter,
  ): Promise<ListOrdemServicoResult> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    } else {
      conditions.push(`status <> ALL(ARRAY['FINALIZADA','ENTREGUE']::status_os[])`);
    }
    if (filter?.clienteId) {
      params.push(filter.clienteId);
      conditions.push(`cliente_id = $${params.length}`);
    }
    if (filter?.veiculoId) {
      params.push(filter.veiculoId);
      conditions.push(`veiculo_id = $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const offset = (page - 1) * limit;
    const listParams = [...params, limit, offset];

    const [{ rows }, countResult] = await Promise.all([
      this.pool.query<OrdemServicoRow>(
        `SELECT * FROM ordens_servico ${where}
         ORDER BY ${STATUS_ORDER_SQL}, data_abertura ASC
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams,
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM ordens_servico ${where}`,
        params,
      ),
    ]);

    return { ordens: await this.hydrate(rows), total: Number(countResult.rows[0].count) };
  }

  async nextSequence(dateKey: string): Promise<number> {
    const { rows } = await this.pool.query<{ sequencia: number }>(
      `INSERT INTO contadores_numero_os (data_chave, sequencia)
       VALUES ($1, 1)
       ON CONFLICT (data_chave)
       DO UPDATE SET sequencia = contadores_numero_os.sequencia + 1
       RETURNING sequencia`,
      [dateKey],
    );
    return rows[0].sequencia;
  }

  private async insertServicos(client: PoolClient, os: OrdemServico): Promise<void> {
    for (const [index, servico] of os.servicos.entries()) {
      await client.query(
        `INSERT INTO servicos_os (
          id, ordem_servico_id, ordem, descricao, status,
          tempo_estimado_minutos, tempo_real_minutos, valor_mao_de_obra, observacoes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          servico.id,
          os.id,
          index,
          servico.descricao,
          servico.status,
          servico.tempoEstimadoMinutos,
          servico.tempoRealMinutos ?? null,
          servico.valorMaoDeObra,
          servico.observacoes ?? null,
        ],
      );
      for (const peca of servico.pecasUtilizadas) {
        await client.query(
          `INSERT INTO servico_pecas (
            id, servico_os_id, peca_id, descricao, quantidade, preco_unitario
          ) VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            uuidv4(),
            servico.id,
            peca.pecaId,
            peca.descricao ?? null,
            peca.quantidade,
            peca.precoUnitario,
          ],
        );
      }
    }
  }

  /** Carrega `servicos_os`/`servico_pecas` em lote para uma página de OSes e remonta a árvore. */
  private async hydrate(osRows: OrdemServicoRow[]): Promise<OrdemServico[]> {
    if (osRows.length === 0) return [];
    const osIds = osRows.map((r) => r.id);

    const { rows: servicoRows } = await this.pool.query<ServicoOSRow>(
      'SELECT * FROM servicos_os WHERE ordem_servico_id = ANY($1)',
      [osIds],
    );

    const servicoIds = servicoRows.map((s) => s.id);
    const pecaRowsByServicoId = new Map<string, ServicoPecaRow[]>();
    if (servicoIds.length > 0) {
      const { rows: pecaRows } = await this.pool.query<ServicoPecaRow>(
        'SELECT * FROM servico_pecas WHERE servico_os_id = ANY($1)',
        [servicoIds],
      );
      for (const peca of pecaRows) {
        const list = pecaRowsByServicoId.get(peca.servico_os_id) ?? [];
        list.push(peca);
        pecaRowsByServicoId.set(peca.servico_os_id, list);
      }
    }

    const servicoRowsByOsId = new Map<string, ServicoOSRow[]>();
    for (const servico of servicoRows) {
      const list = servicoRowsByOsId.get(servico.ordem_servico_id) ?? [];
      list.push(servico);
      servicoRowsByOsId.set(servico.ordem_servico_id, list);
    }

    return osRows.map((osRow) =>
      toDomainOrdemServico(osRow, servicoRowsByOsId.get(osRow.id) ?? [], pecaRowsByServicoId),
    );
  }
}
