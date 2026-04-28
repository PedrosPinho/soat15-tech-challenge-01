import { CreatePagamentoUseCase } from '@application/use-cases/pagamento/create-pagamento.use-case';
import { IPagamentoRepository } from '@domain/repositories/pagamento.repository';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';

function makeOS(status: 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' = 'EM_ANDAMENTO'): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
    status,
  });
}

function makePagamentoRepo(): IPagamentoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByOrdemServicoId: jest.fn().mockResolvedValue([]),
    list: jest.fn(),
    update: jest.fn(),
    sumConfirmados: jest.fn().mockResolvedValue(0),
  };
}

function makeOsRepo(os: OrdemServico | null): IOrdemServicoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(os),
    findByNumeroOS: jest.fn(),
    findByClienteId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    nextSequence: jest.fn(),
  };
}

const validDto = {
  ordemServicoId: 'os-uuid-1',
  valor: 350.00,
  formaPagamento: 'PIX' as const,
};

describe('CreatePagamentoUseCase', () => {
  it('creates and confirms payment, updates OS', async () => {
    const pgtoRepo = makePagamentoRepo();
    const osRepo = makeOsRepo(makeOS('EM_ANDAMENTO'));
    const useCase = new CreatePagamentoUseCase(pgtoRepo, osRepo);

    const result = await useCase.execute(validDto);

    expect(result.id).toBeDefined();
    expect(result.status).toBe('CONFIRMADO');
    expect(result.dataPagamento).toBeDefined();
    expect(result.valor).toBe(350);
    expect(pgtoRepo.save).toHaveBeenCalledTimes(1);
    expect(osRepo.update).toHaveBeenCalledTimes(1);
  });

  it('also works when OS is CONCLUIDA', async () => {
    const pgtoRepo = makePagamentoRepo();
    const osRepo = makeOsRepo(makeOS('CONCLUIDA'));
    const useCase = new CreatePagamentoUseCase(pgtoRepo, osRepo);

    const result = await useCase.execute(validDto);
    expect(result.status).toBe('CONFIRMADO');
  });

  it('throws NotFoundError when OS not found', async () => {
    const pgtoRepo = makePagamentoRepo();
    const osRepo = makeOsRepo(null);
    const useCase = new CreatePagamentoUseCase(pgtoRepo, osRepo);

    await expect(useCase.execute(validDto)).rejects.toThrow(NotFoundError);
    expect(pgtoRepo.save).not.toHaveBeenCalled();
  });

  it('throws ValidationError when OS is ABERTA', async () => {
    const pgtoRepo = makePagamentoRepo();
    const osRepo = makeOsRepo(makeOS('ABERTA'));
    const useCase = new CreatePagamentoUseCase(pgtoRepo, osRepo);

    await expect(useCase.execute(validDto)).rejects.toThrow(ValidationError);
    expect(pgtoRepo.save).not.toHaveBeenCalled();
  });

  it('throws ValidationError when OS is CANCELADA', async () => {
    const pgtoRepo = makePagamentoRepo();
    const osRepo = makeOsRepo(makeOS('CANCELADA'));
    const useCase = new CreatePagamentoUseCase(pgtoRepo, osRepo);

    await expect(useCase.execute(validDto)).rejects.toThrow(ValidationError);
  });

  it('accepts optional observacoes', async () => {
    const pgtoRepo = makePagamentoRepo();
    const osRepo = makeOsRepo(makeOS());
    const useCase = new CreatePagamentoUseCase(pgtoRepo, osRepo);

    const result = await useCase.execute({ ...validDto, observacoes: 'Pago via app' });
    expect(result.observacoes).toBe('Pago via app');
  });
});
