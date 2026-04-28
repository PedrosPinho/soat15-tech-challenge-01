import { GetPecaUseCase } from '@application/use-cases/peca/get-peca.use-case';
import { IPecaRepository } from '@domain/repositories/peca.repository';
import { Peca } from '@domain/entities/peca.entity';
import { NotFoundError } from '@shared/errors/domain.error';

function makePeca(): Peca {
  return Peca.create({
    codigo: 'FLT-OL-001',
    descricao: 'Filtro de óleo esportivo',
    categoria: 'FILTROS',
    precoCompra: 25.00,
    precoVenda: 45.00,
    unidadeMedida: 'UNIDADE',
    nivelMinimo: 5,
    nivelMaximo: 50,
  });
}

function makeRepo(overrides: Partial<IPecaRepository> = {}): IPecaRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByCodigo: jest.fn().mockResolvedValue(null),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

describe('GetPecaUseCase', () => {
  it('returns peca when found', async () => {
    const peca = makePeca();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(peca) });
    const useCase = new GetPecaUseCase(repo);

    const result = await useCase.execute(peca.id);

    expect(result.id).toBe(peca.id);
    expect(result.codigo).toBe('FLT-OL-001');
  });

  it('throws NotFoundError when peca does not exist', async () => {
    const repo = makeRepo();
    const useCase = new GetPecaUseCase(repo);

    await expect(useCase.execute('non-existent')).rejects.toThrow(NotFoundError);
  });
});
