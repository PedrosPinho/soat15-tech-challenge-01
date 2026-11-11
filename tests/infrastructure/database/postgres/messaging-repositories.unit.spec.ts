import { PostgresInboxRepository } from '@infrastructure/database/postgres/repositories/inbox.repository.impl';
import { PostgresOutboxRepository } from '@infrastructure/database/postgres/repositories/outbox.repository.impl';
import { PostgresSagaRepository } from '@infrastructure/database/postgres/repositories/saga.repository.impl';
import { PostgresStatusHistoricoRepository } from '@infrastructure/database/postgres/repositories/status-historico.repository.impl';
import { SagaConcurrencyError } from '@domain/repositories/saga.repository';
import { SagaInstancia } from '@domain/entities/saga.entity';
import { createEnvelope } from '@shared/messaging/envelope';

/** Testes de contrato SQL/mapeamento com pool simulado (os de verdade rodam com Testcontainers). */
const poolWith = (...results: object[]) => {
  const query = jest.fn();
  results.forEach((r) => query.mockResolvedValueOnce(r));
  query.mockResolvedValue({ rows: [], rowCount: 0 });
  return { query, pool: { query } as never };
};

const saga: SagaInstancia = {
  id: 'sg', ordemServicoId: 'os', passoAtual: 'DIAGNOSTICO', status: 'EM_ANDAMENTO',
  dados: { reservas: [], passosIniciados: ['DIAGNOSTICO'], compensacoesPendentes: [], tentativasCompensacao: 0, correlationId: 'c' },
  versao: 3, criadoEm: new Date('2026-01-01'), atualizadoEm: new Date('2026-01-02'),
};
const sagaRow = {
  id: 'sg', ordem_servico_id: 'os', passo_atual: 'ORCAMENTO', status: 'EM_ANDAMENTO',
  dados: saga.dados, versao: 4, expira_em: new Date('2026-02-01'),
  criado_em: saga.criadoEm, atualizado_em: saga.atualizadoEm,
};

describe('PostgresSagaRepository', () => {
  it('create serializa os dados em JSON', async () => {
    const { query, pool } = poolWith();
    await new PostgresSagaRepository(pool).create(saga);
    expect(query.mock.calls[0][0]).toContain('INSERT INTO saga_instancias');
    expect(query.mock.calls[0][1][4]).toBe(JSON.stringify(saga.dados));
  });

  it('findByOrdemServicoId usa FOR UPDATE e mapeia a linha', async () => {
    const { query, pool } = poolWith({ rows: [sagaRow] });
    const found = await new PostgresSagaRepository(pool).findByOrdemServicoId('os');
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(found).toMatchObject({ id: 'sg', passoAtual: 'ORCAMENTO', versao: 4, expiraEm: new Date('2026-02-01') });
  });

  it('findByOrdemServicoId devolve null quando não existe', async () => {
    const { pool } = poolWith({ rows: [] });
    expect(await new PostgresSagaRepository(pool).findByOrdemServicoId('x')).toBeNull();
  });

  it('update exige a versão lida (WHERE versao) e devolve a nova', async () => {
    const { query, pool } = poolWith({ rows: [{ ...sagaRow, versao: 4, expira_em: null }] });
    const updated = await new PostgresSagaRepository(pool).update(saga);
    expect(query.mock.calls[0][0]).toContain('versao = versao + 1');
    expect(query.mock.calls[0][0]).toContain('AND versao = $7');
    expect(query.mock.calls[0][1][6]).toBe(3);
    expect(updated.versao).toBe(4);
    expect(updated.expiraEm).toBeUndefined();
  });

  it('update sem linha afetada lança SagaConcurrencyError', async () => {
    const { pool } = poolWith({ rows: [] });
    await expect(new PostgresSagaRepository(pool).update(saga)).rejects.toThrow(SagaConcurrencyError);
  });

  it('findExpired filtra sagas ativas vencidas', async () => {
    const { query, pool } = poolWith({ rows: [sagaRow] });
    const list = await new PostgresSagaRepository(pool).findExpired(new Date(), 5);
    expect(query.mock.calls[0][0]).toContain("status IN ('EM_ANDAMENTO','COMPENSANDO')");
    expect(list).toHaveLength(1);
  });

  it('appendLog e listLog', async () => {
    const ocorridoEm = new Date();
    const { query, pool } = poolWith({}, {
      rows: [{ saga_id: 'sg', passo: 'P', acao: 'A', resultado: 'OK', mensagem_id: null, detalhe: 'd', ocorrido_em: ocorridoEm }],
    });
    const repo = new PostgresSagaRepository(pool);
    await repo.appendLog({ sagaId: 'sg', passo: 'P', acao: 'A', resultado: 'OK', ocorridoEm });
    expect(query.mock.calls[0][0]).toContain('INSERT INTO saga_passos_log');
    expect(await repo.listLog('sg')).toEqual([
      { sagaId: 'sg', passo: 'P', acao: 'A', resultado: 'OK', mensagemId: undefined, detalhe: 'd', ocorridoEm },
    ]);
  });
});

describe('PostgresOutboxRepository', () => {
  const envelope = createEnvelope({ type: 'X', sagaId: 's', correlationId: 'c', payload: {} });

  it('enqueue grava o envelope', async () => {
    const { query, pool } = poolWith();
    await new PostgresOutboxRepository(pool).enqueue({ kind: 'queue', destination: 'q', envelope });
    expect(query.mock.calls[0][1].slice(1, 4)).toEqual(['queue', 'q', 'X']);
  });

  it('claimBatch usa FOR UPDATE SKIP LOCKED e mapeia', async () => {
    const { query, pool } = poolWith({
      rows: [{ id: 'o1', tipo_destino: 'topic', destino: 't', envelope, tentativas: 2 }],
    });
    const batch = await new PostgresOutboxRepository(pool).claimBatch(10);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(batch).toEqual([{ id: 'o1', kind: 'topic', destination: 't', envelope, tentativas: 2 }]);
  });

  it('markPublished / markFailed (erro truncado)', async () => {
    const { query, pool } = poolWith();
    const repo = new PostgresOutboxRepository(pool);
    await repo.markPublished('o1');
    await repo.markFailed('o1', 'x'.repeat(5000), new Date());
    expect(query.mock.calls[0][0]).toContain('publicado_em = now()');
    expect(query.mock.calls[1][1][1]).toHaveLength(1000);
  });
});

describe('PostgresInboxRepository', () => {
  it('true na primeira vez, false quando já processada', async () => {
    const { query, pool } = poolWith({ rowCount: 1 }, { rowCount: 0 });
    const repo = new PostgresInboxRepository(pool);
    expect(await repo.markProcessed('m', 'X')).toBe(true);
    expect(await repo.markProcessed('m', 'X')).toBe(false);
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT (message_id) DO NOTHING');
  });

  it('rowCount nulo conta como duplicada', async () => {
    const { pool } = poolWith({ rowCount: null });
    expect(await new PostgresInboxRepository(pool).markProcessed('m', 'X')).toBe(false);
  });
});

describe('PostgresStatusHistoricoRepository', () => {
  it('add e listByOrdemServico', async () => {
    const ocorridoEm = new Date();
    const { query, pool } = poolWith({}, {
      rows: [{ ordem_servico_id: 'os', status_anterior: null, status_novo: 'RECEBIDA', motivo: null, ocorrido_em: ocorridoEm }],
    });
    const repo = new PostgresStatusHistoricoRepository(pool);
    await repo.add({ ordemServicoId: 'os', statusNovo: 'RECEBIDA', ocorridoEm });
    expect(query.mock.calls[0][1]).toEqual(['os', null, 'RECEBIDA', null, ocorridoEm]);
    expect(await repo.listByOrdemServico('os')).toEqual([
      { ordemServicoId: 'os', statusAnterior: undefined, statusNovo: 'RECEBIDA', motivo: undefined, ocorridoEm },
    ]);
  });
});
