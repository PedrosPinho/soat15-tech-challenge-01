import { MongoClienteRepository } from '@infrastructure/database/mongodb/repositories/cliente.repository.impl';
import { Cliente } from '@domain/entities/cliente.entity';

jest.mock('@infrastructure/database/mongodb/schemas/cliente.schema', () => ({
  ClienteModel: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ClienteModel } = require('@infrastructure/database/mongodb/schemas/cliente.schema') as {
  ClienteModel: {
    create: jest.Mock; findById: jest.Mock; findOne: jest.Mock;
    find: jest.Mock; countDocuments: jest.Mock; findByIdAndUpdate: jest.Mock;
  };
};

const makeChain = () => ({
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockResolvedValue([]),
});

const clienteDoc = {
  _id: 'uuid-1',
  nome: 'João Silva',
  cpfCnpj: '529.982.247-25',
  tipo: 'PESSOA_FISICA' as const,
  telefone: '11999999999',
  email: 'joao@test.com',
  endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'SP', estado: 'SP', cep: '01000-000' },
  dataCadastro: new Date(),
  ativo: true,
};

function makeCliente(): Cliente {
  return Cliente.create({
    id: 'uuid-1', nome: 'João Silva', cpfCnpj: '529.982.247-25', tipo: 'PESSOA_FISICA',
    telefone: '11999999999', email: 'joao@test.com',
    endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'SP', estado: 'SP', cep: '01000-000' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  ClienteModel.create.mockResolvedValue(undefined);
  ClienteModel.findById.mockResolvedValue(null);
  ClienteModel.findOne.mockResolvedValue(null);
  ClienteModel.findByIdAndUpdate.mockResolvedValue(undefined);
  ClienteModel.find.mockReturnValue(makeChain());
  ClienteModel.countDocuments.mockResolvedValue(0);
});

describe('MongoClienteRepository', () => {
  const repo = new MongoClienteRepository();

  it('save — serializes and calls create', async () => {
    await repo.save(makeCliente());
    expect(ClienteModel.create).toHaveBeenCalledTimes(1);
    const arg = ClienteModel.create.mock.calls[0][0] as Record<string, unknown>;
    expect(arg['_id']).toBe('uuid-1');
    expect(arg['nome']).toBe('João Silva');
  });

  it('findById — returns null when not found', async () => {
    expect(await repo.findById('x')).toBeNull();
  });

  it('findById — returns Cliente when found', async () => {
    ClienteModel.findById.mockResolvedValue(clienteDoc);
    const result = await repo.findById('uuid-1');
    expect(result?.nome).toBe('João Silva');
  });

  it('findByCpfCnpj — returns null', async () => {
    expect(await repo.findByCpfCnpj('000.000.000-00')).toBeNull();
    expect(ClienteModel.findOne).toHaveBeenCalledWith({ cpfCnpj: '000.000.000-00' });
  });

  it('findByCpfCnpj — returns Cliente when found', async () => {
    ClienteModel.findOne.mockResolvedValue(clienteDoc);
    const result = await repo.findByCpfCnpj('529.982.247-25');
    expect(result?.nome).toBe('João Silva');
  });

  it('findByEmail — lowercases the email', async () => {
    await repo.findByEmail('TEST@TEST.COM');
    expect(ClienteModel.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
  });

  it('findByEmail — returns Cliente when found', async () => {
    ClienteModel.findOne.mockResolvedValue(clienteDoc);
    const result = await repo.findByEmail('joao@test.com');
    expect(result?.email).toBe('joao@test.com');
  });

  it('list — returns empty list', async () => {
    const result = await repo.list(1, 10);
    expect(result.clientes).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('list — returns mapped clientes', async () => {
    const chain = makeChain();
    chain.sort = jest.fn().mockResolvedValue([clienteDoc]);
    ClienteModel.find.mockReturnValue(chain);
    ClienteModel.countDocuments.mockResolvedValue(1);
    const result = await repo.list(1, 10);
    expect(result.clientes).toHaveLength(1);
    expect(result.clientes[0].nome).toBe('João Silva');
    expect(result.total).toBe(1);
  });

  it('update — calls findByIdAndUpdate', async () => {
    await repo.update(makeCliente());
    expect(ClienteModel.findByIdAndUpdate.mock.calls[0][0]).toBe('uuid-1');
  });

  it('delete — sets ativo to false', async () => {
    await repo.delete('uuid-1');
    expect(ClienteModel.findByIdAndUpdate).toHaveBeenCalledWith('uuid-1', { ativo: false });
  });
});
