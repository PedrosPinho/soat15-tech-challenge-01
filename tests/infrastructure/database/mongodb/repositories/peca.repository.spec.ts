import { MongoPecaRepository } from '@infrastructure/database/mongodb/repositories/peca.repository.impl';
import { Peca } from '@domain/entities/peca.entity';

jest.mock('@infrastructure/database/mongodb/schemas/peca.schema', () => ({
  PecaModel: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PecaModel } = require('@infrastructure/database/mongodb/schemas/peca.schema') as {
  PecaModel: {
    create: jest.Mock; findById: jest.Mock; findOne: jest.Mock;
    find: jest.Mock; countDocuments: jest.Mock; findByIdAndUpdate: jest.Mock;
  };
};

const makeChain = () => ({
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  sort: jest.fn().mockResolvedValue([]),
});

const pecaDoc = {
  _id: 'p-uuid-1', codigo: 'FO-001', descricao: 'Filtro de óleo premium',
  categoria: 'FILTROS', precoCompra: 10, precoVenda: 25,
  unidadeMedida: 'UNIDADE', nivelMinimo: 5, nivelMaximo: 100, ativo: true,
};

function makePeca(): Peca {
  return Peca.create({
    id: 'p-uuid-1', codigo: 'FO-001', descricao: 'Filtro de óleo premium',
    categoria: 'FILTROS', precoCompra: 10, precoVenda: 25,
    unidadeMedida: 'UNIDADE', nivelMinimo: 5, nivelMaximo: 100,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  PecaModel.create.mockResolvedValue(undefined);
  PecaModel.findById.mockResolvedValue(null);
  PecaModel.findOne.mockResolvedValue(null);
  PecaModel.findByIdAndUpdate.mockResolvedValue(undefined);
  PecaModel.find.mockReturnValue(makeChain());
  PecaModel.countDocuments.mockResolvedValue(0);
});

describe('MongoPecaRepository', () => {
  const repo = new MongoPecaRepository();

  it('save — calls PecaModel.create', async () => {
    await repo.save(makePeca());
    const arg = PecaModel.create.mock.calls[0][0] as Record<string, unknown>;
    expect(arg['_id']).toBe('p-uuid-1');
    expect(arg['codigo']).toBe('FO-001');
  });

  it('findById — returns null when not found', async () => {
    expect(await repo.findById('x')).toBeNull();
  });

  it('findById — returns Peca when found', async () => {
    PecaModel.findById.mockResolvedValue(pecaDoc);
    const result = await repo.findById('p-uuid-1');
    expect(result?.codigo).toBe('FO-001');
  });

  it('findByCodigo — queries and returns null', async () => {
    expect(await repo.findByCodigo('NONE')).toBeNull();
    expect(PecaModel.findOne).toHaveBeenCalledWith({ codigo: 'NONE' });
  });

  it('findByCodigo — returns Peca when found', async () => {
    PecaModel.findOne.mockResolvedValue(pecaDoc);
    const result = await repo.findByCodigo('FO-001');
    expect(result?.descricao).toBe('Filtro de óleo premium');
  });

  it('list — returns empty list by default', async () => {
    const result = await repo.list(1, 10);
    expect(result.pecas).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('list — applies categoria, search, ativo filters', async () => {
    await repo.list(1, 10, { categoria: 'FILTROS', search: 'oleo', ativo: true });
    const findArg = PecaModel.find.mock.calls[0][0] as Record<string, unknown>;
    expect(findArg['categoria']).toBe('FILTROS');
    expect(findArg['$text']).toEqual({ $search: 'oleo' });
    expect(findArg['ativo']).toBe(true);
  });

  it('list — returns mapped pecas', async () => {
    const chain = makeChain();
    chain.sort = jest.fn().mockResolvedValue([pecaDoc]);
    PecaModel.find.mockReturnValue(chain);
    PecaModel.countDocuments.mockResolvedValue(1);
    const result = await repo.list(1, 10, {});
    expect(result.pecas).toHaveLength(1);
    expect(result.pecas[0].codigo).toBe('FO-001');
  });

  it('update — calls PecaModel.findByIdAndUpdate', async () => {
    await repo.update(makePeca());
    expect(PecaModel.findByIdAndUpdate.mock.calls[0][0]).toBe('p-uuid-1');
  });

  it('delete — sets ativo false', async () => {
    await repo.delete('p-uuid-1');
    expect(PecaModel.findByIdAndUpdate).toHaveBeenCalledWith('p-uuid-1', { ativo: false });
  });
});
