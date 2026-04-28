import { ListPecasUseCase } from '@application/use-cases/peca/list-pecas.use-case';
import { IPecaRepository } from '@domain/repositories/peca.repository';
import { Peca } from '@domain/entities/peca.entity';

function makePeca(codigo: string): Peca {
  return Peca.create({
    codigo,
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
    list: jest.fn().mockResolvedValue({ pecas: [], total: 0 }),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

describe('ListPecasUseCase', () => {
  it('returns paginated list with total', async () => {
    const pecas = [makePeca('FLT-001'), makePeca('FLT-002')];
    const repo = makeRepo({ list: jest.fn().mockResolvedValue({ pecas, total: 10 }) });
    const useCase = new ListPecasUseCase(repo);

    const result = await useCase.execute({ page: 1, limit: 2 });

    expect(result.pecas).toHaveLength(2);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(repo.list).toHaveBeenCalledWith(1, 2, { ativo: true });
  });

  it('passes categoria filter to repository', async () => {
    const repo = makeRepo();
    const useCase = new ListPecasUseCase(repo);

    await useCase.execute({ categoria: 'MOTOR' });

    expect(repo.list).toHaveBeenCalledWith(1, 20, { ativo: true, categoria: 'MOTOR' });
  });

  it('passes search filter to repository', async () => {
    const repo = makeRepo();
    const useCase = new ListPecasUseCase(repo);

    await useCase.execute({ search: 'filtro' });

    expect(repo.list).toHaveBeenCalledWith(1, 20, { ativo: true, search: 'filtro' });
  });

  it('defaults to only active pecas', async () => {
    const repo = makeRepo();
    const useCase = new ListPecasUseCase(repo);

    await useCase.execute({});

    const filter = (repo.list as jest.Mock).mock.calls[0][2];
    expect(filter.ativo).toBe(true);
  });

  it('uses defaults when page and limit not provided', async () => {
    const repo = makeRepo();
    const useCase = new ListPecasUseCase(repo);

    await useCase.execute({});

    expect(repo.list).toHaveBeenCalledWith(1, 20, expect.any(Object));
  });

  it('clamps limit to maximum 100', async () => {
    const repo = makeRepo();
    const useCase = new ListPecasUseCase(repo);

    await useCase.execute({ limit: 999 });

    const [, limit] = (repo.list as jest.Mock).mock.calls[0];
    expect(limit).toBe(100);
  });
});
