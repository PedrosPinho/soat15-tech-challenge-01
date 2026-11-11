import express from 'express';
import request from 'supertest';
import { createInternalRouter } from '@presentation/routes/internal.routes';
import { errorHandler } from '@presentation/middlewares/error.middleware';
import { Cliente } from '@domain/entities/cliente.entity';

const cliente = Cliente.create({
  id: 'cli-1', nome: 'Maria', cpfCnpj: '52998224725', tipo: 'PESSOA_FISICA',
  telefone: '11987654321', email: 'm@x.com',
  endereco: { logradouro: 'R', numero: '1', bairro: 'B', cidade: 'SP', estado: 'SP', cep: '01234567' },
});

const makeApp = (found: Cliente | null) => {
  const findByCpfCnpj = jest.fn().mockResolvedValue(found);
  const app = express();
  app.use('/internal', createInternalRouter(() => ({ findByCpfCnpj }) as never));
  app.use(errorHandler);
  return { app, findByCpfCnpj };
};

describe('GET /internal/clientes/by-cpf/:cpf', () => {
  beforeEach(() => { process.env.INTERNAL_API_TOKEN = 'segredo-interno'; });
  afterAll(() => { delete process.env.INTERNAL_API_TOKEN; });

  it('sem token: 401', async () => {
    const { app, findByCpfCnpj } = makeApp(cliente);
    const res = await request(app).get('/internal/clientes/by-cpf/52998224725');
    expect(res.status).toBe(401);
    expect(findByCpfCnpj).not.toHaveBeenCalled();
  });

  it('token errado (mesmo tamanho ou não): 401', async () => {
    const { app } = makeApp(cliente);
    for (const t of ['segredo-interno-x', 'segredo-INTERNO']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get('/internal/clientes/by-cpf/52998224725').set('x-internal-token', t);
      expect(res.status).toBe(401);
    }
  });

  it('servidor sem INTERNAL_API_TOKEN configurado: 401 mesmo com header', async () => {
    delete process.env.INTERNAL_API_TOKEN;
    const { app } = makeApp(cliente);
    const res = await request(app).get('/internal/clientes/by-cpf/52998224725').set('x-internal-token', '');
    expect(res.status).toBe(401);
  });

  it('retorna id, nome, cpf e ativo (formatação do CPF tolerada)', async () => {
    const { app, findByCpfCnpj } = makeApp(cliente);
    const res = await request(app)
      .get('/internal/clientes/by-cpf/529.982.247-25')
      .set('x-internal-token', 'segredo-interno');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'cli-1', nome: 'Maria', cpfCnpj: '52998224725', ativo: true });
    expect(findByCpfCnpj).toHaveBeenCalledWith('52998224725');
  });

  it('cliente inexistente: 404', async () => {
    const { app } = makeApp(null);
    const res = await request(app).get('/internal/clientes/by-cpf/52998224725').set('x-internal-token', 'segredo-interno');
    expect(res.status).toBe(404);
  });

  it('CPF inválido: 400', async () => {
    const { app } = makeApp(cliente);
    const res = await request(app).get('/internal/clientes/by-cpf/123').set('x-internal-token', 'segredo-interno');
    expect(res.status).toBe(400);
  });
});
