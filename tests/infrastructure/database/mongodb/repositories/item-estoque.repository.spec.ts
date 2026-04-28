import { MongoItemEstoqueRepository } from '@infrastructure/database/mongodb/repositories/item-estoque.repository.impl';
import { ItemEstoque } from '@domain/entities/item-estoque.entity';

jest.mock('@infrastructure/database/mongodb/schemas/item-estoque.schema', () => ({
  ItemEstoqueModel: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ItemEstoqueModel } = require('@infrastructure/database/mongodb/schemas/item-estoque.schema') as {
  ItemEstoqueModel: {
    create: jest.Mock; findOne: jest.Mock; find: jest.Mock; findByIdAndUpdate: jest.Mock;
  };
};

const itemDoc = {
  _id: 'ie-uuid-1', pecaId: 'p-uuid-1',
  quantidadeDisponivel: 10, quantidadeReservada: 0,
  nivelMinimo: 5, nivelMaximo: 100,
  criadoEm: new Date(), atualizadoEm: new Date(),
};

const itemAbaixoDoc = {
  ...itemDoc, _id: 'ie-uuid-2',
  quantidadeDisponivel: 2, nivelMinimo: 5,
};

function makeItem(): ItemEstoque {
  return ItemEstoque.create({
    id: 'ie-uuid-1', pecaId: 'p-uuid-1',
    quantidadeDisponivel: 10, quantidadeReservada: 0,
    nivelMinimo: 5, nivelMaximo: 100,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  ItemEstoqueModel.create.mockResolvedValue(undefined);
  ItemEstoqueModel.findOne.mockResolvedValue(null);
  ItemEstoqueModel.find.mockResolvedValue([]);
  ItemEstoqueModel.findByIdAndUpdate.mockResolvedValue(undefined);
});

describe('MongoItemEstoqueRepository', () => {
  const repo = new MongoItemEstoqueRepository();

  it('save — calls ItemEstoqueModel.create', async () => {
    await repo.save(makeItem());
    const arg = ItemEstoqueModel.create.mock.calls[0][0] as Record<string, unknown>;
    expect(arg['pecaId']).toBe('p-uuid-1');
    expect(arg['quantidadeDisponivel']).toBe(10);
  });

  it('findByPecaId — returns null when not found', async () => {
    expect(await repo.findByPecaId('x')).toBeNull();
    expect(ItemEstoqueModel.findOne).toHaveBeenCalledWith({ pecaId: 'x' });
  });

  it('findByPecaId — returns ItemEstoque when found', async () => {
    ItemEstoqueModel.findOne.mockResolvedValue(itemDoc);
    const result = await repo.findByPecaId('p-uuid-1');
    expect(result?.pecaId).toBe('p-uuid-1');
    expect(result?.quantidadeDisponivel).toBe(10);
  });

  it('update — calls ItemEstoqueModel.findByIdAndUpdate', async () => {
    await repo.update(makeItem());
    expect(ItemEstoqueModel.findByIdAndUpdate.mock.calls[0][0]).toBe('ie-uuid-1');
  });

  it('list — returns all items when no filter', async () => {
    ItemEstoqueModel.find.mockResolvedValue([itemDoc]);
    const result = await repo.list();
    expect(result).toHaveLength(1);
  });

  it('list — filters below minimum when abaixoMinimo=true', async () => {
    ItemEstoqueModel.find.mockResolvedValue([itemDoc, itemAbaixoDoc]);
    const result = await repo.list({ abaixoMinimo: true });
    expect(result).toHaveLength(1);
    expect(result[0].quantidadeDisponivel).toBe(2);
  });

  it('list — returns all when abaixoMinimo=false', async () => {
    ItemEstoqueModel.find.mockResolvedValue([itemDoc, itemAbaixoDoc]);
    const result = await repo.list({ abaixoMinimo: false });
    expect(result).toHaveLength(2);
  });
});
