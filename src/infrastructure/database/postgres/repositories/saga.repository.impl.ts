import { Pool } from 'pg';
import {
  SagaDados,
  SagaInstancia,
  SagaPassoLog,
  SagaStatus,
  PassoSaga,
} from '@domain/entities/saga.entity';
import { ISagaRepository, SagaConcurrencyError } from '@domain/repositories/saga.repository';
import { txAwarePool } from '../unit-of-work';

interface SagaRow {
  id: string;
  ordem_servico_id: string;
  passo_atual: PassoSaga;
  status: SagaStatus;
  dados: SagaDados;
  versao: number;
  expira_em: Date | null;
  criado_em: Date;
  atualizado_em: Date;
}

interface LogRow {
  saga_id: string;
  passo: string;
  acao: string;
  resultado: SagaPassoLog['resultado'];
  mensagem_id: string | null;
  detalhe: string | null;
  ocorrido_em: Date;
}

const toDomain = (r: SagaRow): SagaInstancia => ({
  id: r.id,
  ordemServicoId: r.ordem_servico_id,
  passoAtual: r.passo_atual,
  status: r.status,
  dados: r.dados,
  versao: r.versao,
  expiraEm: r.expira_em ?? undefined,
  criadoEm: r.criado_em,
  atualizadoEm: r.atualizado_em,
});

export class PostgresSagaRepository implements ISagaRepository {
  constructor(private readonly pool: Pool = txAwarePool()) {}

  async create(s: SagaInstancia): Promise<void> {
    await this.pool.query(
      `INSERT INTO saga_instancias
         (id, ordem_servico_id, passo_atual, status, dados, versao, expira_em, criado_em, atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        s.id,
        s.ordemServicoId,
        s.passoAtual,
        s.status,
        JSON.stringify(s.dados),
        s.versao,
        s.expiraEm ?? null,
        s.criadoEm,
        s.atualizadoEm,
      ],
    );
  }

  async findByOrdemServicoId(ordemServicoId: string): Promise<SagaInstancia | null> {
    // FOR UPDATE: serializa respostas concorrentes da mesma saga dentro da transação.
    const { rows } = await this.pool.query<SagaRow>(
      'SELECT * FROM saga_instancias WHERE ordem_servico_id = $1 FOR UPDATE',
      [ordemServicoId],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async update(s: SagaInstancia): Promise<SagaInstancia> {
    const { rows } = await this.pool.query<SagaRow>(
      `UPDATE saga_instancias
         SET passo_atual = $2, status = $3, dados = $4, expira_em = $5,
             versao = versao + 1, atualizado_em = $6
       WHERE id = $1 AND versao = $7
       RETURNING *`,
      [
        s.id,
        s.passoAtual,
        s.status,
        JSON.stringify(s.dados),
        s.expiraEm ?? null,
        s.atualizadoEm,
        s.versao,
      ],
    );
    if (!rows[0]) throw new SagaConcurrencyError(s.id);
    return toDomain(rows[0]);
  }

  async findExpired(now: Date, limit: number): Promise<SagaInstancia[]> {
    const { rows } = await this.pool.query<SagaRow>(
      `SELECT * FROM saga_instancias
        WHERE expira_em IS NOT NULL AND expira_em <= $1
          AND status IN ('EM_ANDAMENTO','COMPENSANDO')
        ORDER BY expira_em LIMIT $2`,
      [now, limit],
    );
    return rows.map(toDomain);
  }

  async appendLog(e: SagaPassoLog): Promise<void> {
    await this.pool.query(
      `INSERT INTO saga_passos_log (saga_id, passo, acao, resultado, mensagem_id, detalhe, ocorrido_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        e.sagaId,
        e.passo,
        e.acao,
        e.resultado,
        e.mensagemId ?? null,
        e.detalhe ?? null,
        e.ocorridoEm,
      ],
    );
  }

  async listLog(sagaId: string): Promise<SagaPassoLog[]> {
    const { rows } = await this.pool.query<LogRow>(
      'SELECT * FROM saga_passos_log WHERE saga_id = $1 ORDER BY id',
      [sagaId],
    );
    return rows.map((r) => ({
      sagaId: r.saga_id,
      passo: r.passo,
      acao: r.acao,
      resultado: r.resultado,
      mensagemId: r.mensagem_id ?? undefined,
      detalhe: r.detalhe ?? undefined,
      ocorridoEm: r.ocorrido_em,
    }));
  }
}
