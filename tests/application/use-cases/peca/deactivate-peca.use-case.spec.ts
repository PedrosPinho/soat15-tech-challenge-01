import { DeactivatePecaUseCase } from '@application/use-cases/peca/deactivate-peca.use-case';
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

describe('DeactivatePecaUseCase', () => {
  it('deactivates an active peca', async () => {
    const peca = makePeca();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(peca) });
    const useCase = new DeactivatePecaUseCase(repo);

    await useCase.execute(peca.id);

    expect(repo.update).toHaveBeenCalledTimes(1);
    const saved = (repo.update as jest.Mock).mock.calls[0][0] as Peca;
    expect(saved.ativo).toBe(false);
  });

  it('throws NotFoundError when peca does not exist', async () => {
    const repo = makeRepo();
    const useCase = new DeactivatePecaUseCase(repo);

    await expect(useCase.execute('non-existent')).rejects.toThrow(NotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('is idempotent for already-inactive peca', async () => {
    const peca = makePeca().desativar();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(peca) });
    const useCase = new DeactivatePecaUseCase(repo);

    await expect(useCase.execute(peca.id)).resolves.not.toThrow();
    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});
