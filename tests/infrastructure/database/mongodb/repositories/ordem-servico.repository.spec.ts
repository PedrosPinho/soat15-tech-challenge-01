import { MongoOrdemServicoRepository } from '@infrastructure/database/mongodb/repositories/ordem-servico.repository.impl';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';

jest.mock('@infrastructure/database/mongodb/schemas/ordem-servico.schema', () => ({
  OrdemServicoModel: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  OSCounterModel: {
    findByIdAndUpdate: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OrdemServicoModel, OSCounterModel } = require('@infrastructure/database/mongodb/schemas/ordem-servico.schema') as {
  OrdemServicoModel: {
    create: jest.Mock; findById: jest.Mock; findOne: jest.Mock;
    find: jest.Mock; countDocuments: jest.Mock; findByIdAndUpdate: jest.Mock;
  };
  OSCounterModel: { findByIdAndUpdate: jest.Mock; };
};

const makeChain = () => ({
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockResolvedValue([]),
});

const osDoc = {
  _id: 'os-uuid-1', numeroOS: 'OS-20260428-0001',
  clienteId: 'c-uuid-1', veiculoId: 'v-uuid-1',
  quilometragemEntrada: 50000, status: 'ABERTA',
  dataAbertura: new Date(), dataInicio: undefined,
  dataConclusao: undefined, observacoes: undefined,
  motivoCancelamento: undefined, temPagamento: false, servicos: [],
};

const osDocWithServico = {
  ...osDoc, status: 'EM_ANDAMENTO',
  servicos: [{
    _id: 'srv-uuid-1', descricao: 'Troca de óleo', status: 'PENDENTE',
    tempoEstimadoMinutos: 30, tempoRealMinutos: undefined,
    valorMaoDeObra: 100, pecasUtilizadas: [], observacoes: undefined,
  }],
};

function makeOS(): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1', numeroOS: 'OS-20260428-0001',
    clienteId: 'c-uuid-1', veiculoId: 'v-uuid-1', quilometragemEntrada: 50000,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  OrdemServicoModel.create.mockResolvedValue(undefined);
  OrdemServicoModel.findById.mockResolvedValue(null);
  OrdemServicoModel.findOne.mockResolvedValue(null);
  OrdemServicoModel.findByIdAndUpdate.mockResolvedValue(undefined);
  OrdemServicoModel.find.mockReturnValue(makeChain());
  OrdemServicoModel.countDocuments.mockResolvedValue(0);
  OSCounterModel.findByIdAndUpdate.mockResolvedValue({ seq: 1 });
});

describe('MongoOrdemServicoRepository', () => {
  const repo = new MongoOrdemServicoRepository();

  it('save — calls OrdemServicoModel.create', async () => {
    await repo.save(makeOS());
    const arg = OrdemServicoModel.create.mock.calls[0][0] as Record<string, unknown>;
    expect(arg['_id']).toBe('os-uuid-1');
    expect(arg['numeroOS']).toBe('OS-20260428-0001');
  });

  it('findById — returns null when not found', async () => {
    expect(await repo.findById('x')).toBeNull();
  });

  it('findById — returns OrdemServico without servicos', async () => {
    OrdemServicoModel.findById.mockResolvedValue(osDoc);
    const result = await repo.findById('os-uuid-1');
    expect(result?.clienteId).toBe('c-uuid-1');
    expect(result?.servicos).toHaveLength(0);
  });

  it('findById — reconstitutes embedded servicos', async () => {
    OrdemServicoModel.findById.mockResolvedValue(osDocWithServico);
    const result = await repo.findById('os-uuid-1');
    expect(result?.servicos).toHaveLength(1);
    expect(result?.servicos[0].descricao).toBe('Troca de óleo');
  });

  it('findByNumeroOS — returns null when not found', async () => {
    expect(await repo.findByNumeroOS('OS-NONE')).toBeNull();
    expect(OrdemServicoModel.findOne).toHaveBeenCalledWith({ numeroOS: 'OS-NONE' });
  });

  it('findByNumeroOS — returns OrdemServico when found', async () => {
    OrdemServicoModel.findOne.mockResolvedValue(osDoc);
    const result = await repo.findByNumeroOS('OS-20260428-0001');
    expect(result?.numeroOS).toBe('OS-20260428-0001');
  });

  it('findByClienteId — returns empty list', async () => {
    const result = await repo.findByClienteId('c-uuid-1', 1, 10);
    expect(result.ordens).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('findByClienteId — returns mapped OS', async () => {
    const chain = makeChain();
    chain.sort = jest.fn().mockResolvedValue([osDoc]);
    OrdemServicoModel.find.mockReturnValue(chain);
    OrdemServicoModel.countDocuments.mockResolvedValue(1);
    const result = await repo.findByClienteId('c-uuid-1', 1, 10);
    expect(result.ordens).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('list — returns empty list', async () => {
    const result = await repo.list(1, 10);
    expect(result.ordens).toHaveLength(0);
  });

  it('list — applies status, clienteId, veiculoId filters', async () => {
    await repo.list(1, 10, { status: 'ABERTA', clienteId: 'c-uuid-1', veiculoId: 'v-uuid-1' });
    const findArg = OrdemServicoModel.find.mock.calls[0][0] as Record<string, unknown>;
    expect(findArg['status']).toBe('ABERTA');
    expect(findArg['clienteId']).toBe('c-uuid-1');
    expect(findArg['veiculoId']).toBe('v-uuid-1');
  });

  it('list — returns mapped OS', async () => {
    const chain = makeChain();
    chain.sort = jest.fn().mockResolvedValue([osDoc]);
    OrdemServicoModel.find.mockReturnValue(chain);
    OrdemServicoModel.countDocuments.mockResolvedValue(1);
    const result = await repo.list(1, 10, {});
    expect(result.ordens).toHaveLength(1);
    expect(result.ordens[0].clienteId).toBe('c-uuid-1');
  });

  it('update — calls OrdemServicoModel.findByIdAndUpdate', async () => {
    await repo.update(makeOS());
    expect(OrdemServicoModel.findByIdAndUpdate.mock.calls[0][0]).toBe('os-uuid-1');
  });

  it('nextSequence — returns seq from counter', async () => {
    const result = await repo.nextSequence('20260428');
    expect(result).toBe(1);
    expect(OSCounterModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '20260428', { $inc: { seq: 1 } }, { upsert: true, new: true },
    );
  });
});
