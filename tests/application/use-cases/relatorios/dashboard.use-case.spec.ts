import { DashboardUseCase } from '@application/use-cases/relatorios/dashboard.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IPagamentoRepository } from '@domain/repositories/pagamento.repository';
import { IItemEstoqueRepository } from '@domain/repositories/item-estoque.repository';
import { ItemEstoque } from '@domain/entities/item-estoque.entity';

function makeOsRepo(totals: Record<string, number>): IOrdemServicoRepository {
  return {
    list: jest.fn().mockImplementation((_p, _l, filter?: { status?: string }) => {
      const key = filter?.status ?? 'ALL';
      return Promise.resolve({ ordens: [], total: totals[key] ?? 0 });
    }),
    save: jest.fn(),
    findById: jest.fn(),
    findByNumeroOS: jest.fn(),
    findByClienteId: jest.fn(),
    update: jest.fn(),
    nextSequence: jest.fn(),
  };
}

function makePagamentoRepo(total: number): IPagamentoRepository {
  return {
    sumConfirmados: jest.fn().mockResolvedValue(total),
    save: jest.fn(),
    findById: jest.fn(),
    findByOrdemServicoId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };
}

function makeItemEstoque(quantidadeDisponivel: number, nivelMinimo: number): ItemEstoque {
  return ItemEstoque.create({
    id: 'ie1',
    pecaId: 'p1',
    quantidadeDisponivel,
    quantidadeReservada: 0,
    nivelMinimo,
    nivelMaximo: nivelMinimo + 100,
  });
}

function makeEstoqueRepo(items: ItemEstoque[]): IItemEstoqueRepository {
  return {
    list: jest.fn().mockResolvedValue(items),
    findByPecaId: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
}

describe('DashboardUseCase', () => {
  it('returns dashboard with correct counts and revenue', async () => {
    const osRepo = makeOsRepo({ ALL: 10, RECEBIDA: 3, EM_EXECUCAO: 2, FINALIZADA: 4, CANCELADA: 1 });
    const pgtoRepo = makePagamentoRepo(5000);
    const estoqueRepo = makeEstoqueRepo([
      makeItemEstoque(5, 2),  // above minimum
      makeItemEstoque(1, 3),  // below minimum
      makeItemEstoque(0, 1),  // below minimum
    ]);

    const useCase = new DashboardUseCase(osRepo, pgtoRepo, estoqueRepo);
    const result = await useCase.execute();

    expect(result.ordensServico.total).toBe(10);
    expect(result.ordensServico.recebidas).toBe(3);
    expect(result.ordensServico.emExecucao).toBe(2);
    expect(result.ordensServico.finalizadas).toBe(4);
    expect(result.ordensServico.canceladas).toBe(1);
    expect(result.financeiro.receitaTotal).toBe(5000);
    expect(result.estoque.itensAbaixoDoMinimo).toBe(2);
  });

  it('returns zero counts and revenue when empty', async () => {
    const osRepo = makeOsRepo({});
    const pgtoRepo = makePagamentoRepo(0);
    const estoqueRepo = makeEstoqueRepo([]);

    const useCase = new DashboardUseCase(osRepo, pgtoRepo, estoqueRepo);
    const result = await useCase.execute();

    expect(result.ordensServico.total).toBe(0);
    expect(result.financeiro.receitaTotal).toBe(0);
    expect(result.estoque.itensAbaixoDoMinimo).toBe(0);
  });
});
