import { ListPagamentosUseCase } from '@application/use-cases/pagamento/list-pagamentos.use-case';
import { IPagamentoRepository } from '@domain/repositories/pagamento.repository';
import { Pagamento } from '@domain/entities/pagamento.entity';

function makePagamento(id: string) {
  return Pagamento.create({ id, ordemServicoId: 'os1', valor: 300, formaPagamento: 'PIX' }).confirmar();
}

function makeRepo(pagamentos: Pagamento[], total: number): IPagamentoRepository {
  return {
    list: jest.fn().mockResolvedValue({ pagamentos, total }),
    findById: jest.fn(),
    findByOrdemServicoId: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    sumConfirmados: jest.fn(),
  };
}

describe('ListPagamentosUseCase', () => {
  it('returns pagamentos with default pagination', async () => {
    const pgs = [makePagamento('pg1'), makePagamento('pg2')];
    const repo = makeRepo(pgs, 2);
    const useCase = new ListPagamentosUseCase(repo);

    const result = await useCase.execute({});

    expect(result.pagamentos).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(repo.list).toHaveBeenCalledWith(1, 20, { ordemServicoId: undefined, status: undefined });
  });

  it('uses provided page and limit', async () => {
    const repo = makeRepo([], 0);
    const useCase = new ListPagamentosUseCase(repo);

    const result = await useCase.execute({ page: 3, limit: 5 });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(5);
    expect(repo.list).toHaveBeenCalledWith(3, 5, { ordemServicoId: undefined, status: undefined });
  });

  it('passes filters to repo', async () => {
    const repo = makeRepo([], 0);
    const useCase = new ListPagamentosUseCase(repo);

    await useCase.execute({ ordemServicoId: 'os1', status: 'CONFIRMADO' });

    expect(repo.list).toHaveBeenCalledWith(1, 20, { ordemServicoId: 'os1', status: 'CONFIRMADO' });
  });
});
