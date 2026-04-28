import { ListOrdensServicoUseCase } from '@application/use-cases/ordem-servico/list-ordens-servico.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';

function makeOS(id: string): OrdemServico {
  return OrdemServico.create({
    id,
    numeroOS: `OS-20260428-000${id.slice(-1)}`,
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
  });
}

function makeRepo(ordens: OrdemServico[], total = ordens.length): IOrdemServicoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByNumeroOS: jest.fn(),
    findByClienteId: jest.fn(),
    list: jest.fn().mockResolvedValue({ ordens, total }),
    update: jest.fn(),
    nextSequence: jest.fn(),
  };
}

describe('ListOrdensServicoUseCase', () => {
  it('returns paginated list with defaults', async () => {
    const repo = makeRepo([makeOS('os-1'), makeOS('os-2')], 2);
    const useCase = new ListOrdensServicoUseCase(repo);

    const result = await useCase.execute({});

    expect(result.ordens).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(repo.list).toHaveBeenCalledWith(1, 20, {});
  });

  it('passes page and limit to repository', async () => {
    const repo = makeRepo([]);
    const useCase = new ListOrdensServicoUseCase(repo);

    await useCase.execute({ page: 2, limit: 10 });

    expect(repo.list).toHaveBeenCalledWith(2, 10, {});
  });

  it('passes status filter to repository', async () => {
    const repo = makeRepo([]);
    const useCase = new ListOrdensServicoUseCase(repo);

    await useCase.execute({ status: 'ABERTA' });

    expect(repo.list).toHaveBeenCalledWith(1, 20, { status: 'ABERTA' });
  });

  it('passes clienteId filter to repository', async () => {
    const repo = makeRepo([]);
    const useCase = new ListOrdensServicoUseCase(repo);

    await useCase.execute({ clienteId: 'cliente-uuid-1' });

    expect(repo.list).toHaveBeenCalledWith(1, 20, { clienteId: 'cliente-uuid-1' });
  });

  it('maps ordens to DTOs', async () => {
    const repo = makeRepo([makeOS('os-1')]);
    const useCase = new ListOrdensServicoUseCase(repo);

    const result = await useCase.execute({});

    expect(result.ordens[0]!.id).toBe('os-1');
    expect(result.ordens[0]!.status).toBe('ABERTA');
  });
});
