import express, { Application } from 'express';
import request from 'supertest';
import type { Router } from 'express';
import type { ErrorRequestHandler } from 'express';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../setup/mongo-memory.helper';

jest.setTimeout(30000);

process.env['WEBHOOK_SECRET'] = 'test-webhook-secret';

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
/* eslint-enable @typescript-eslint/no-require-imports */

const app: Application = express();
app.use(express.json());
app.use('/api/clientes', clienteRouter);
app.use('/api/veiculos', veiculoRouter);
app.use('/api/ordens-servico', ordemServicoRouter);
app.use(errorHandler);

beforeAll(async () => {
  await connectTestDatabase();
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
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

  const veiculoRes = await request(app).post('/api/veiculos').send({
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
  it('percorre RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA → ENTREGUE via webhook de aprovação', async () => {
    const { cpfCnpj, placa } = await seedClienteEVeiculo('ABC1D23');

    const createRes = await request(app)
      .post('/api/ordens-servico')
      .send({ cpfCnpj, placa, quilometragemEntrada: 50000 });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('RECEBIDA');
    const osId = createRes.body.id as string;

    const iniciarRes = await request(app).patch(`/api/ordens-servico/${osId}/iniciar`);
    expect(iniciarRes.status).toBe(200);
    expect(iniciarRes.body.status).toBe('EM_DIAGNOSTICO');

    const aguardarRes = await request(app).patch(
      `/api/ordens-servico/${osId}/aguardar-aprovacao`,
    );
    expect(aguardarRes.status).toBe(200);
    expect(aguardarRes.body.status).toBe('AGUARDANDO_APROVACAO');

    const webhookRes = await request(app)
      .post(`/api/ordens-servico/${osId}/orcamento/webhook`)
      .set('x-webhook-secret', 'test-webhook-secret')
      .send({ aprovado: true });
    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.status).toBe('EM_EXECUCAO');

    const concluirRes = await request(app).patch(`/api/ordens-servico/${osId}/concluir`);
    expect(concluirRes.status).toBe(200);
    expect(concluirRes.body.status).toBe('FINALIZADA');

    const entregarRes = await request(app).patch(`/api/ordens-servico/${osId}/entregar`);
    expect(entregarRes.status).toBe(200);
    expect(entregarRes.body.status).toBe('ENTREGUE');

    const finalGet = await request(app).get(`/api/ordens-servico/${osId}`);
    expect(finalGet.body.status).toBe('ENTREGUE');
  });

  it('cancela a OS via webhook quando o cliente recusa o orçamento', async () => {
    const { cpfCnpj, placa } = await seedClienteEVeiculo('XYZ9K88');

    const createRes = await request(app)
      .post('/api/ordens-servico')
      .send({ cpfCnpj, placa, quilometragemEntrada: 30000 });
    const osId = createRes.body.id as string;

    await request(app).patch(`/api/ordens-servico/${osId}/iniciar`);
    await request(app).patch(`/api/ordens-servico/${osId}/aguardar-aprovacao`);

    const webhookRes = await request(app)
      .post(`/api/ordens-servico/${osId}/orcamento/webhook`)
      .set('x-webhook-secret', 'test-webhook-secret')
      .send({ aprovado: false, motivo: 'Valor acima do esperado' });

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.status).toBe('CANCELADA');
    expect(webhookRes.body.motivoCancelamento).toBe('Valor acima do esperado');
  });

  it('rejeita o webhook sem o secret correto', async () => {
    const { cpfCnpj, placa } = await seedClienteEVeiculo('DEF4G56');
    const createRes = await request(app)
      .post('/api/ordens-servico')
      .send({ cpfCnpj, placa, quilometragemEntrada: 10000 });
    const osId = createRes.body.id as string;

    const res = await request(app)
      .post(`/api/ordens-servico/${osId}/orcamento/webhook`)
      .send({ aprovado: true });

    expect(res.status).toBe(401);
  });
});

describe('Listagem/ordenação de OS (E2E)', () => {
  it('ordena por status e esconde FINALIZADA/ENTREGUE por padrão', async () => {
    const statuses: { placa: string; transitions: number }[] = [
      { placa: 'AAA1111', transitions: 0 }, // RECEBIDA
      { placa: 'BBB2222', transitions: 1 }, // EM_DIAGNOSTICO
      { placa: 'CCC3333', transitions: 2 }, // AGUARDANDO_APROVACAO
      { placa: 'DDD4444', transitions: 3 }, // EM_EXECUCAO
      { placa: 'EEE5555', transitions: 4 }, // FINALIZADA
      { placa: 'FFF6666', transitions: 5 }, // ENTREGUE
    ];

    for (const { placa, transitions } of statuses) {
      const { cpfCnpj } = await seedClienteEVeiculo(placa);
      const createRes = await request(app)
        .post('/api/ordens-servico')
        .send({ cpfCnpj, placa, quilometragemEntrada: 1000 });
      const osId = createRes.body.id as string;

      const steps = [
        () => request(app).patch(`/api/ordens-servico/${osId}/iniciar`),
        () => request(app).patch(`/api/ordens-servico/${osId}/aguardar-aprovacao`),
        () =>
          request(app)
            .post(`/api/ordens-servico/${osId}/orcamento/webhook`)
            .set('x-webhook-secret', 'test-webhook-secret')
            .send({ aprovado: true }),
        () => request(app).patch(`/api/ordens-servico/${osId}/concluir`),
        () => request(app).patch(`/api/ordens-servico/${osId}/entregar`),
      ];

      for (let i = 0; i < transitions; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await steps[i]();
      }
    }

    const listRes = await request(app).get('/api/ordens-servico');
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(4);
    expect(
      (listRes.body.ordens as { status: string }[]).map((o) => o.status),
    ).toEqual(['EM_EXECUCAO', 'AGUARDANDO_APROVACAO', 'EM_DIAGNOSTICO', 'RECEBIDA']);

    const finalizadaRes = await request(app)
      .get('/api/ordens-servico')
      .query({ status: 'FINALIZADA' });
    expect(finalizadaRes.body.total).toBe(1);
    expect(finalizadaRes.body.ordens[0].status).toBe('FINALIZADA');
  });
});
