import { GetPagamentoUseCase } from '@application/use-cases/pagamento/get-pagamento.use-case';
import { IPagamentoRepository } from '@domain/repositories/pagamento.repository';
import { Pagamento } from '@domain/entities/pagamento.entity';
import { NotFoundError } from '@shared/errors/domain.error';

function makePagamento() {
  return Pagamento.create({
    id: 'pg1',
    ordemServicoId: 'os1',
    valor: 500,
    formaPagamento: 'PIX',
  }).confirmar();
}

function makeRepo(pagamento: Pagamento | null): IPagamentoRepository {
  return {
    findById: jest.fn().mockResolvedValue(pagamento),
    save: jest.fn(),
    findByOrdemServicoId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    sumConfirmados: jest.fn(),
  };
}

describe('GetPagamentoUseCase', () => {
  it('returns DTO when pagamento found', async () => {
    const pg = makePagamento();
    const useCase = new GetPagamentoUseCase(makeRepo(pg));
    const result = await useCase.execute('pg1');

    expect(result.id).toBe('pg1');
    expect(result.status).toBe('CONFIRMADO');
    expect(result.valor).toBe(500);
  });

  it('throws NotFoundError when pagamento not found', async () => {
    const useCase = new GetPagamentoUseCase(makeRepo(null));
    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
  });
});
