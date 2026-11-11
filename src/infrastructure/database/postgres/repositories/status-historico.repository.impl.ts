import { Pool } from 'pg';
import { StatusOS } from '@domain/entities/ordem-servico.entity';
import {
  IStatusHistoricoRepository,
  StatusHistoricoEntry,
} from '@domain/repositories/status-historico.repository';
import { txAwarePool } from '../unit-of-work';

interface Row {
  ordem_servico_id: string;
  status_anterior: StatusOS | null;
  status_novo: StatusOS;
  motivo: string | null;
  ocorrido_em: Date;
}

export class PostgresStatusHistoricoRepository implements IStatusHistoricoRepository {
  constructor(private readonly pool: Pool = txAwarePool()) {}

  async add(e: StatusHistoricoEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO os_status_historico
         (ordem_servico_id, status_anterior, status_novo, motivo, ocorrido_em)
       VALUES ($1,$2,$3,$4,$5)`,
      [e.ordemServicoId, e.statusAnterior ?? null, e.statusNovo, e.motivo ?? null, e.ocorridoEm],
    );
  }

  async listByOrdemServico(ordemServicoId: string): Promise<StatusHistoricoEntry[]> {
    const { rows } = await this.pool.query<Row>(
      'SELECT * FROM os_status_historico WHERE ordem_servico_id = $1 ORDER BY id',
      [ordemServicoId],
    );
    return rows.map((r) => ({
      ordemServicoId: r.ordem_servico_id,
      statusAnterior: r.status_anterior ?? undefined,
      statusNovo: r.status_novo,
      motivo: r.motivo ?? undefined,
      ocorridoEm: r.ocorrido_em,
    }));
  }
}
