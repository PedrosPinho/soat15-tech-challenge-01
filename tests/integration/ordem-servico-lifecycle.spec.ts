import express, { Application } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { Router } from 'express';
import type { ErrorRequestHandler } from 'express';
import { getPool, setPool } from '@infrastructure/database/postgres/pool';
import { createEnvelope } from '@shared/messaging/envelope';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

process.env['JWT_SECRET'] = 'test-jwt-secret';
const JWT_SECRET = process.env['JWT_SECRET'];

const authToken = jwt.sign({ sub: 'e2e-user', email: 'e2e@test.com', scope: 'interno' }, JWT_SECRET);
const authHeader = `Bearer ${authToken}`;

const clienteTokenFor = (cpf: string): string =>
  jwt.sign({ sub: `cliente-${cpf}`, cpf, scope: 'cliente' }, JWT_SECRET);

jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: jest.fn().mockResolvedValue(undefined) }),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { errorHandler } = require('@presentation/middlewares/error.middleware') as {
  errorHandler: ErrorRequestHandler;
};
const { clienteRouter } = require('@presentation/routes/cliente.routes') as {
  clienteRouter: Router;
};
const { veiculoRouter } = require('@presentation/routes/veiculo.routes') as {
  veiculoRouter: Router;
};
const { ordemServicoRouter } = require('@presentation/routes/ordem-servico.routes') as {
  ordemServicoRouter: Router;
};
const { getSagaRuntime } = require('@main/factories/saga.factory') as {
  getSagaRuntime: () => { orchestrator: { handleReply(e: unknown): Promise<void> } };
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** Entrega ao orquestrador real (Postgres) uma resposta de participante. */
const responder = (osId: string, type: string, payload: Record<string, unknown> = {}) =>
  getSagaRuntime().orchestrator.handleReply(
    createEnvelope({
      type,
      sagaId: 'e2e',
      correlationId: 'e2e',
      payload: { ordemServicoId: osId, ...payload },
    }),
  );

const tiposNoOutbox = async (): Promise<string[]> => {
  const { rows } = await getPool().query<{ tipo_mensagem: string }>(
    'SELECT tipo_mensagem FROM outbox ORDER BY criado_em, id',
  );
  return rows.map((r) => r.tipo_mensagem);
};

const statusDe = async (osId: string): Promise<string> =>
  (await request(app).get(`/api/ordens-servico/${osId}`).set('Authorization', authHeader)).body
    .status as string;

const ATE: Record<string, [string, Record<string, unknown>][]> = {
  EM_DIAGNOSTICO: [['DiagnosticoIniciado', { execucaoId: 'ex-1' }]],
  AGUARDANDO_APROVACAO: [
    ['DiagnosticoIniciado', { execucaoId: 'ex-1' }],
    ['DiagnosticoConcluido', { execucaoId: 'ex-1', servicos: [] }],
    ['OrcamentoGerado', { orcamentoId: 'orc-1', valorTotal: 0, validadeAte: 'x' }],
  ],
  EM_EXECUCAO: [
    ['DiagnosticoIniciado', { execucaoId: 'ex-1' }],
    ['DiagnosticoConcluido', { execucaoId: 'ex-1', servicos: [] }],
    ['OrcamentoGerado', { orcamentoId: 'orc-1', valorTotal: 0, validadeAte: 'x' }],
    ['OrcamentoAprovado', { orcamentoId: 'orc-1', aprovadoEm: 'x' }],
    ['PagamentoSolicitado', { orcamentoId: 'orc-1', pagamentoId: 'pg-1', initPoint: 'u', expiraEm: 'x' }],
    ['PagamentoConfirmado', { orcamentoId: 'orc-1', pagamentoId: 'pg-1', mpPaymentId: '1', valor: 0, confirmadoEm: 'x' }],
  ],
};
const FINALIZAR: [string, Record<string, unknown>][] = [['ReparoConcluido', { execucaoId: 'ex-1' }]];

const app: Application = express();
app.use(express.json());
app.use('/api/clientes', clienteRouter);
app.use('/api/veiculos', veiculoRouter);
app.use('/api/ordens-servico', ordemServicoRouter);
app.use(errorHandler);

beforeAll(async () => {
  const pool = await startTestDatabase();
  setPool(pool);
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

function computeCpfCheckDigit(digits: string, weightStart: number): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    sum += parseInt(digits[i], 10) * (weightStart - i);
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function generateValidCpf(seed: number): string {
  const base = String(100000001 + seed * 137).padStart(9, '0').slice(0, 9);
  const d1 = computeCpfCheckDigit(base, 10);
  const d2 = computeCpfCheckDigit(`${base}${d1}`, 11);
  return `${base}${d1}${d2}`;
}

let cpfSeq = 0;
async function seedClienteEVeiculo(placa: string): Promise<{ cpfCnpj: string; placa: string }> {
  cpfSeq += 1;
  const cpfCnpj = generateValidCpf(cpfSeq);

  const clienteRes = await request(app)
    .post('/api/clientes')
    .set('Authorization', authHeader)
    .send({
      nome: 'Cliente E2E',
      cpfCnpj,
      tipo: 'PESSOA_FISICA',
      telefone: '11987654321',
      email: `cliente${cpfSeq}@email.com`,
      endereco: {
        logradouro: 'Rua A',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
      },
    });
  expect(clienteRes.status).toBe(201);

  const veiculoRes = await request(app)
    .post('/api/veiculos')
    .set('Authorization', authHeader)
    .send({
      clienteId: clienteRes.body.id,
      placa,
      marca: 'Honda',
      modelo: 'Civic',
      ano: 2020,
    });
  expect(veiculoRes.status).toBe(201);

  return { cpfCnpj, placa };
}

describe('Ciclo completo de status da OS (E2E)', () => {
  const abrirOS = async (placa: string, km = 50000): Promise<string> => {
    const { cpfCnpj } = await seedClienteEVeiculo(placa);
    const createRes = await request(app)
      .post('/api/ordens-servico')
      .set('Authorization', authHeader)
      .send({ cpfCnpj, placa, quilometragemEntrada: km });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('RECEBIDA');
    return createRes.body.id as string;
  };

  it('criar a OS grava a saga e o comando SolicitarDiagnostico no outbox, atomicamente', async () => {
    await abrirOS('ABC1D23');
    expect(await tiposNoOutbox()).toEqual(['SolicitarDiagnostico']);
    const saga = await getPool().query("SELECT status, passo_atual FROM saga_instancias");
    expect(saga.rows).toEqual([{ status: 'EM_ANDAMENTO', passo_atual: 'DIAGNOSTICO' }]);
  });

  it('percorre RECEBIDA → … → FINALIZADA pelas respostas dos participantes e ENTREGUE manualmente', async () => {
    const osId = await abrirOS('ABC1D23');

    for (const [type, payload] of [...ATE['EM_EXECUCAO'], ...FINALIZAR]) {
      // eslint-disable-next-line no-await-in-loop
      await responder(osId, type, payload);
    }
    expect(await statusDe(osId)).toBe('FINALIZADA');

    const entregarRes = await request(app)
      .patch(`/api/ordens-servico/${osId}/entregar`)
      .set('Authorization', authHeader);
    expect(entregarRes.status).toBe(200);
    expect(entregarRes.body.status).toBe('ENTREGUE');

    const historico = await request(app)
      .get(`/api/ordens-servico/${osId}/historico`)
      .set('Authorization', authHeader);
    expect(historico.status).toBe(200);
    expect((historico.body.status as { para: string }[]).map((h) => h.para)).toEqual([
      'RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO',
      'EM_EXECUCAO', 'FINALIZADA',
    ]);
    expect(historico.body.saga.status).toBe('CONCLUIDA');
  });

  it('a mesma resposta entregue 2x executa o handler 1x (inbox)', async () => {
    const osId = await abrirOS('ABC1D23');
    const envelope = createEnvelope({
      type: 'DiagnosticoIniciado',
      sagaId: 'e2e',
      correlationId: 'e2e',
      payload: { ordemServicoId: osId, execucaoId: 'ex-1' },
    });
    const { orchestrator } = getSagaRuntime();
    await orchestrator.handleReply(envelope);
    await orchestrator.handleReply(envelope);
    const { rows } = await getPool().query('SELECT count(*)::int AS n FROM mensagens_processadas');
    expect(rows[0].n).toBe(1);
  });

  it('recusa do orçamento compensa e cancela a OS', async () => {
    const osId = await abrirOS('ABC1D23');
    for (const [type, payload] of ATE['AGUARDANDO_APROVACAO']) {
      // eslint-disable-next-line no-await-in-loop
      await responder(osId, type, payload);
    }
    await responder(osId, 'OrcamentoRecusado', { orcamentoId: 'orc-1', motivo: 'Valor acima do esperado' });
    await responder(osId, 'ExecucaoCancelada', { execucaoId: 'ex-1' });

    const res = await request(app).get(`/api/ordens-servico/${osId}`).set('Authorization', authHeader);
    expect(res.body.status).toBe('CANCELADA');
    expect(res.body.motivoCancelamento).toBe('Valor acima do esperado');
  });

  it('PATCH /:id/cancelar responde 202 e dispara a compensação (não só troca o status)', async () => {
    const osId = await abrirOS('ABC1D23');
    const res = await request(app)
      .patch(`/api/ordens-servico/${osId}/cancelar`)
      .set('Authorization', authHeader)
      .send({ motivo: 'Cliente desistiu do serviço' });
    expect(res.status).toBe(202);
    expect(res.body.status).toBe('RECEBIDA');
    expect(await tiposNoOutbox()).toContain('CancelarExecucao');
    await responder(osId, 'ExecucaoCancelada', {});
    expect(await statusDe(osId)).toBe('CANCELADA');
  });

  it('as rotas manuais de transição foram removidas da API pública', async () => {
    const osId = await abrirOS('ABC1D23');
    for (const rota of ['iniciar', 'aguardar-aprovacao', 'aprovar', 'concluir']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)
        .patch(`/api/ordens-servico/${osId}/${rota}`)
        .set('Authorization', authHeader);
      expect(res.status).toBe(404);
    }
  });
});

describe('Listagem/ordenação de OS (E2E)', () => {
  it('ordena por status e esconde FINALIZADA/ENTREGUE por padrão', async () => {
    const alvos: { placa: string; ate?: string; finalizar?: boolean; entregar?: boolean }[] = [
      { placa: 'AAA1111' }, // RECEBIDA
      { placa: 'BBB2222', ate: 'EM_DIAGNOSTICO' },
      { placa: 'CCC3333', ate: 'AGUARDANDO_APROVACAO' },
      { placa: 'DDD4444', ate: 'EM_EXECUCAO' },
      { placa: 'EEE5555', ate: 'EM_EXECUCAO', finalizar: true }, // FINALIZADA
      { placa: 'FFF6666', ate: 'EM_EXECUCAO', finalizar: true, entregar: true }, // ENTREGUE
    ];

    for (const alvo of alvos) {
      const { cpfCnpj } = await seedClienteEVeiculo(alvo.placa);
      const createRes = await request(app)
        .post('/api/ordens-servico')
        .set('Authorization', authHeader)
        .send({ cpfCnpj, placa: alvo.placa, quilometragemEntrada: 1000 });
      const osId = createRes.body.id as string;

      const respostas = [...(alvo.ate ? ATE[alvo.ate] : []), ...(alvo.finalizar ? FINALIZAR : [])];
      for (const [type, payload] of respostas) {
        // eslint-disable-next-line no-await-in-loop
        await responder(osId, type, payload);
      }
      if (alvo.entregar) {
        // eslint-disable-next-line no-await-in-loop
        await request(app)
          .patch(`/api/ordens-servico/${osId}/entregar`)
          .set('Authorization', authHeader);
      }
    }

    const listRes = await request(app).get('/api/ordens-servico').set('Authorization', authHeader);
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(4);
    expect(
      (listRes.body.ordens as { status: string }[]).map((o) => o.status),
    ).toEqual(['EM_EXECUCAO', 'AGUARDANDO_APROVACAO', 'EM_DIAGNOSTICO', 'RECEBIDA']);

    const finalizadaRes = await request(app)
      .get('/api/ordens-servico')
      .set('Authorization', authHeader)
      .query({ status: 'FINALIZADA' });
    expect(finalizadaRes.body.total).toBe(1);
    expect(finalizadaRes.body.ordens[0].status).toBe('FINALIZADA');
  });
});

describe('Escopos de autorização (Etapa 2.3)', () => {
  it('token de cliente não acessa rota de gestão (POST /api/clientes) — 403', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${clienteTokenFor('11144477735')}`)
      .send({ nome: 'x' });
    expect(res.status).toBe(403);
  });

  it('GET /api/ordens-servico/buscar sem token — 401 (antes era público)', async () => {
    const res = await request(app).get('/api/ordens-servico/buscar').query({ cpfCnpj: '52998224725' });
    expect(res.status).toBe(401);
  });

  it('token de cliente consulta as próprias OS por CPF — 200', async () => {
    const { cpfCnpj, placa } = await seedClienteEVeiculo('CLI0001');
    await request(app)
      .post('/api/ordens-servico')
      .set('Authorization', authHeader)
      .send({ cpfCnpj, placa, quilometragemEntrada: 1000 });

    const res = await request(app)
      .get('/api/ordens-servico/buscar')
      .set('Authorization', `Bearer ${clienteTokenFor(cpfCnpj)}`)
      .query({ cpfCnpj });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('token de cliente não consulta OS de outro CPF — 403', async () => {
    const { cpfCnpj: donoCpf } = await seedClienteEVeiculo('CLI0002');

    const res = await request(app)
      .get('/api/ordens-servico/buscar')
      .set('Authorization', `Bearer ${clienteTokenFor('11144477735')}`)
      .query({ cpfCnpj: donoCpf });

    expect(res.status).toBe(403);
  });

  it('token interno consulta OS por qualquer CPF — 200', async () => {
    const { cpfCnpj } = await seedClienteEVeiculo('CLI0003');

    const res = await request(app)
      .get('/api/ordens-servico/buscar')
      .set('Authorization', authHeader)
      .query({ cpfCnpj });

    expect(res.status).toBe(200);
  });
});
