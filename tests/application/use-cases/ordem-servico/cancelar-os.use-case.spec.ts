import { CancelarOSUseCase } from '@application/use-cases/ordem-servico/cancelar-os.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';

function makeOS(status: StatusOS = 'RECEBIDA', temPagamento = false): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
    status,
    temPagamento,
  });
}

function makeRepo(os: OrdemServico | null, overrides: Partial<IOrdemServicoRepository> = {}): IOrdemServicoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(os),
    findByNumeroOS: jest.fn(),
    findByClienteId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    nextSequence: jest.fn(),
    ...overrides,
  };
}

describe('CancelarOSUseCase', () => {
  it('cancels a RECEBIDA OS with a motivo', async () => {
    const repo = makeRepo(makeOS('RECEBIDA'));
    const useCase = new CancelarOSUseCase(repo);

    const result = await useCase.execute({ id: 'os-uuid-1', motivo: 'Cliente desistiu do serviço' });

    expect(result.status).toBe('CANCELADA');
    expect(result.motivoCancelamento).toBe('Cliente desistiu do serviço');
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('cancels an EM_EXECUCAO OS', async () => {
    const repo = makeRepo(makeOS('EM_EXECUCAO'));
    const useCase = new CancelarOSUseCase(repo);

    const result = await useCase.execute({ id: 'os-uuid-1', motivo: 'Peça indisponível' });

    expect(result.status).toBe('CANCELADA');
  });

  it('throws NotFoundError when OS not found', async () => {
    const repo = makeRepo(null);
    const useCase = new CancelarOSUseCase(repo);

    await expect(useCase.execute({ id: 'nao-existe', motivo: 'qualquer' })).rejects.toThrow(NotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError when OS is FINALIZADA', async () => {
    const repo = makeRepo(makeOS('FINALIZADA'));
    const useCase = new CancelarOSUseCase(repo);

    await expect(useCase.execute({ id: 'os-uuid-1', motivo: 'motivo' })).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError when OS is ENTREGUE', async () => {
    const repo = makeRepo(makeOS('ENTREGUE'));
    const useCase = new CancelarOSUseCase(repo);

    await expect(useCase.execute({ id: 'os-uuid-1', motivo: 'motivo' })).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError when OS already CANCELADA', async () => {
    const repo = makeRepo(makeOS('CANCELADA'));
    const useCase = new CancelarOSUseCase(repo);

    await expect(useCase.execute({ id: 'os-uuid-1', motivo: 'motivo' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when OS has payment', async () => {
    const repo = makeRepo(makeOS('EM_EXECUCAO', true));
    const useCase = new CancelarOSUseCase(repo);

    await expect(useCase.execute({ id: 'os-uuid-1', motivo: 'motivo' })).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when motivo is empty', async () => {
    const repo = makeRepo(makeOS('RECEBIDA'));
    const useCase = new CancelarOSUseCase(repo);

    await expect(useCase.execute({ id: 'os-uuid-1', motivo: '' })).rejects.toThrow(ValidationError);
  });
});
