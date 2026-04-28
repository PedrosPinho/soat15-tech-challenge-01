import { CreatePecaUseCase } from '@application/use-cases/peca/create-peca.use-case';
import { IPecaRepository } from '@domain/repositories/peca.repository';
import { ConflictError, ValidationError } from '@shared/errors/domain.error';

const validDto = {
  codigo: 'FLT-OL-001',
  descricao: 'Filtro de óleo esportivo',
  categoria: 'FILTROS' as const,
  precoCompra: 25.00,
  precoVenda: 45.00,
  unidadeMedida: 'UNIDADE' as const,
  nivelMinimo: 5,
  nivelMaximo: 50,
};

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

describe('CreatePecaUseCase', () => {
  it('creates a Peça with valid data and returns DTO', async () => {
    const repo = makeRepo();
    const useCase = new CreatePecaUseCase(repo);

    const result = await useCase.execute(validDto);

    expect(result.id).toBeDefined();
    expect(result.codigo).toBe('FLT-OL-001');
    expect(result.margemLucro).toBeCloseTo(80, 2);
    expect(result.ativo).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictError when codigo already registered', async () => {
    const existing = { id: 'existing-id' } as any;
    const repo = makeRepo({ findByCodigo: jest.fn().mockResolvedValue(existing) });
    const useCase = new CreatePecaUseCase(repo);

    await expect(useCase.execute(validDto)).rejects.toThrow(ConflictError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('propagates ValidationError from domain (e.g. precoVenda < precoCompra)', async () => {
    const repo = makeRepo();
    const useCase = new CreatePecaUseCase(repo);

    await expect(useCase.execute({ ...validDto, precoVenda: 10.00 })).rejects.toThrow(ValidationError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('creates Peça with minimum valid margin (0%)', async () => {
    const repo = makeRepo();
    const useCase = new CreatePecaUseCase(repo);

    const result = await useCase.execute({ ...validDto, precoVenda: 25.00 });

    expect(result.margemLucro).toBe(0);
  });
});
