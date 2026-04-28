import { UpdatePecaUseCase } from '@application/use-cases/peca/update-peca.use-case';
import { IPecaRepository } from '@domain/repositories/peca.repository';
import { Peca } from '@domain/entities/peca.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';

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

describe('UpdatePecaUseCase', () => {
  it('updates prices and returns new DTO', async () => {
    const peca = makePeca();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(peca) });
    const useCase = new UpdatePecaUseCase(repo);

    const result = await useCase.execute(peca.id, {
      precoCompra: 30.00,
      precoVenda: 60.00,
    });

    expect(result.precoCompra).toBe(30.00);
    expect(result.precoVenda).toBe(60.00);
    expect(result.margemLucro).toBeCloseTo(100, 2);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('updates stock thresholds', async () => {
    const peca = makePeca();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(peca) });
    const useCase = new UpdatePecaUseCase(repo);

    const result = await useCase.execute(peca.id, {
      precoCompra: 25.00,
      precoVenda: 45.00,
      nivelMinimo: 10,
      nivelMaximo: 100,
    });

    expect(result.nivelMinimo).toBe(10);
    expect(result.nivelMaximo).toBe(100);
  });

  it('throws NotFoundError when peca does not exist', async () => {
    const repo = makeRepo();
    const useCase = new UpdatePecaUseCase(repo);

    await expect(
      useCase.execute('non-existent', { precoCompra: 30.00, precoVenda: 60.00 }),
    ).rejects.toThrow(NotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError when new precoVenda < precoCompra', async () => {
    const peca = makePeca();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(peca) });
    const useCase = new UpdatePecaUseCase(repo);

    await expect(
      useCase.execute(peca.id, { precoCompra: 50.00, precoVenda: 30.00 }),
    ).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError when nivelMaximo <= nivelMinimo', async () => {
    const peca = makePeca();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(peca) });
    const useCase = new UpdatePecaUseCase(repo);

    await expect(
      useCase.execute(peca.id, { precoCompra: 25.00, precoVenda: 45.00, nivelMinimo: 20, nivelMaximo: 10 }),
    ).rejects.toThrow(ValidationError);
  });
});
