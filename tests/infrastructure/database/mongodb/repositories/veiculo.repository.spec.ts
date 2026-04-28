import { MongoVeiculoRepository } from '@infrastructure/database/mongodb/repositories/veiculo.repository.impl';
import { Veiculo } from '@domain/entities/veiculo.entity';

jest.mock('@infrastructure/database/mongodb/schemas/veiculo.schema', () => ({
  VeiculoModel: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { VeiculoModel } = require('@infrastructure/database/mongodb/schemas/veiculo.schema') as {
  VeiculoModel: {
    create: jest.Mock; findById: jest.Mock; findOne: jest.Mock;
    find: jest.Mock; countDocuments: jest.Mock;
    findByIdAndUpdate: jest.Mock; findByIdAndDelete: jest.Mock;
  };
};

const makeChain = () => ({
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockResolvedValue([]),
});

const veiculoDoc = {
  _id: 'v-uuid-1', clienteId: 'c-uuid-1', placa: 'ABC1234',
  marca: 'VW', modelo: 'Gol', ano: 2020, quilometragem: 50000,
  cor: undefined, chassi: undefined, renavam: undefined, observacoes: undefined,
  criadoEm: new Date(),
};

function makeVeiculo(): Veiculo {
  return Veiculo.create({
    id: 'v-uuid-1', clienteId: 'c-uuid-1', placa: 'ABC1234',
    marca: 'VW', modelo: 'Gol', ano: 2020, quilometragem: 50000,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  VeiculoModel.create.mockResolvedValue(undefined);
  VeiculoModel.findById.mockResolvedValue(null);
  VeiculoModel.findOne.mockResolvedValue(null);
  VeiculoModel.findByIdAndUpdate.mockResolvedValue(undefined);
  VeiculoModel.findByIdAndDelete.mockResolvedValue(undefined);
  VeiculoModel.find.mockReturnValue(makeChain());
  VeiculoModel.countDocuments.mockResolvedValue(0);
});

describe('MongoVeiculoRepository', () => {
  const repo = new MongoVeiculoRepository();

  it('save — calls VeiculoModel.create', async () => {
    await repo.save(makeVeiculo());
    const arg = VeiculoModel.create.mock.calls[0][0] as Record<string, unknown>;
    expect(arg['_id']).toBe('v-uuid-1');
    expect(arg['placa']).toBe('ABC1234');
  });

  it('findById — returns null', async () => {
    expect(await repo.findById('x')).toBeNull();
  });

  it('findById — returns Veiculo when found', async () => {
    VeiculoModel.findById.mockResolvedValue(veiculoDoc);
    const result = await repo.findById('v-uuid-1');
    expect(result?.marca).toBe('VW');
    expect(result?.modelo).toBe('Gol');
  });

  it('findByPlaca — uppercases and searches', async () => {
    await repo.findByPlaca('abc1234');
    expect(VeiculoModel.findOne).toHaveBeenCalledWith({ placa: 'ABC1234' });
  });

  it('findByPlaca — returns Veiculo when found', async () => {
    VeiculoModel.findOne.mockResolvedValue(veiculoDoc);
    const result = await repo.findByPlaca('ABC1234');
    expect(result?.ano).toBe(2020);
  });

  it('findByClienteId — returns empty list', async () => {
    const result = await repo.findByClienteId('c-uuid-1', 1, 10);
    expect(result.veiculos).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('findByClienteId — returns mapped veiculos', async () => {
    const chain = makeChain();
    chain.sort = jest.fn().mockResolvedValue([veiculoDoc]);
    VeiculoModel.find.mockReturnValue(chain);
    VeiculoModel.countDocuments.mockResolvedValue(1);
    const result = await repo.findByClienteId('c-uuid-1', 1, 10);
    expect(result.veiculos).toHaveLength(1);
    expect(result.veiculos[0].placa.value).toBe('ABC1234');
  });

  it('update — calls VeiculoModel.findByIdAndUpdate', async () => {
    await repo.update(makeVeiculo());
    expect(VeiculoModel.findByIdAndUpdate.mock.calls[0][0]).toBe('v-uuid-1');
  });

  it('delete — calls VeiculoModel.findByIdAndDelete', async () => {
    await repo.delete('v-uuid-1');
    expect(VeiculoModel.findByIdAndDelete).toHaveBeenCalledWith('v-uuid-1');
  });
});
