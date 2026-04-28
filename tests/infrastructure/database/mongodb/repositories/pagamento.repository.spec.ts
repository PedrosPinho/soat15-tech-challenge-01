import { MongoPagamentoRepository } from '@infrastructure/database/mongodb/repositories/pagamento.repository.impl';
import { Pagamento } from '@domain/entities/pagamento.entity';

jest.mock('@infrastructure/database/mongodb/schemas/pagamento.schema', () => ({
  PagamentoModel: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    aggregate: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PagamentoModel } = require('@infrastructure/database/mongodb/schemas/pagamento.schema') as {
  PagamentoModel: {
    create: jest.Mock; findById: jest.Mock; find: jest.Mock;
    countDocuments: jest.Mock; findByIdAndUpdate: jest.Mock; aggregate: jest.Mock;
  };
};

const makeChain = () => ({
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockResolvedValue([]),
});

const pagDoc = {
  _id: 'pg-uuid-1', ordemServicoId: 'os-uuid-1',
  valor: 500, formaPagamento: 'PIX', status: 'CONFIRMADO',
  dataPagamento: new Date(), observacoes: undefined, criadoEm: new Date(),
};

function makePagamento(): Pagamento {
  return Pagamento.create({
    id: 'pg-uuid-1', ordemServicoId: 'os-uuid-1',
    valor: 500, formaPagamento: 'PIX',
  }).confirmar();
}

beforeEach(() => {
  jest.clearAllMocks();
  PagamentoModel.create.mockResolvedValue(undefined);
  PagamentoModel.findById.mockResolvedValue(null);
  PagamentoModel.find.mockReturnValue(makeChain());
  PagamentoModel.countDocuments.mockResolvedValue(0);
  PagamentoModel.findByIdAndUpdate.mockResolvedValue(undefined);
  PagamentoModel.aggregate.mockResolvedValue([]);
});

describe('MongoPagamentoRepository', () => {
  const repo = new MongoPagamentoRepository();

  it('save — calls PagamentoModel.create', async () => {
    await repo.save(makePagamento());
    const arg = PagamentoModel.create.mock.calls[0][0] as Record<string, unknown>;
    expect(arg['_id']).toBe('pg-uuid-1');
    expect(arg['valor']).toBe(500);
    expect(arg['status']).toBe('CONFIRMADO');
  });

  it('findById — returns null when not found', async () => {
    expect(await repo.findById('x')).toBeNull();
  });

  it('findById — returns Pagamento when found', async () => {
    PagamentoModel.findById.mockResolvedValue(pagDoc);
    const result = await repo.findById('pg-uuid-1');
    expect(result?.valor).toBe(500);
    expect(result?.status).toBe('CONFIRMADO');
  });

  it('findByOrdemServicoId — returns empty array', async () => {
    PagamentoModel.find.mockResolvedValue([]);
    const result = await repo.findByOrdemServicoId('os-uuid-1');
    expect(result).toHaveLength(0);
    expect(PagamentoModel.find).toHaveBeenCalledWith({ ordemServicoId: 'os-uuid-1' });
  });

  it('findByOrdemServicoId — returns mapped pagamentos', async () => {
    PagamentoModel.find.mockResolvedValue([pagDoc]);
    const result = await repo.findByOrdemServicoId('os-uuid-1');
    expect(result).toHaveLength(1);
    expect(result[0].ordemServicoId).toBe('os-uuid-1');
  });

  it('list — returns empty list', async () => {
    const result = await repo.list(1, 10);
    expect(result.pagamentos).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('list — applies ordemServicoId and status filters', async () => {
    await repo.list(1, 10, { ordemServicoId: 'os-uuid-1', status: 'CONFIRMADO' });
    const findArg = PagamentoModel.find.mock.calls[0][0] as Record<string, unknown>;
    expect(findArg['ordemServicoId']).toBe('os-uuid-1');
    expect(findArg['status']).toBe('CONFIRMADO');
  });

  it('list — returns mapped pagamentos', async () => {
    const chain = makeChain();
    chain.sort = jest.fn().mockResolvedValue([pagDoc]);
    PagamentoModel.find.mockReturnValue(chain);
    PagamentoModel.countDocuments.mockResolvedValue(1);
    const result = await repo.list(1, 10, {});
    expect(result.pagamentos).toHaveLength(1);
    expect(result.pagamentos[0].valor).toBe(500);
  });

  it('update — calls PagamentoModel.findByIdAndUpdate', async () => {
    await repo.update(makePagamento());
    expect(PagamentoModel.findByIdAndUpdate.mock.calls[0][0]).toBe('pg-uuid-1');
  });

  it('sumConfirmados — returns 0 when no aggregate result', async () => {
    expect(await repo.sumConfirmados()).toBe(0);
    expect(PagamentoModel.aggregate).toHaveBeenCalled();
  });

  it('sumConfirmados — returns aggregated total', async () => {
    PagamentoModel.aggregate.mockResolvedValue([{ total: 7500 }]);
    expect(await repo.sumConfirmados()).toBe(7500);
  });
});
