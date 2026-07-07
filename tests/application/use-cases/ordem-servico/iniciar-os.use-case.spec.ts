import { IniciarOSUseCase } from '@application/use-cases/ordem-servico/iniciar-os.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';
import { makeClienteRepo, makeNotificationService } from './notificacao-test-helpers';

function makeOS(status: StatusOS = 'RECEBIDA'): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
    status,
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

describe('IniciarOSUseCase', () => {
  it('transitions OS from RECEBIDA to EM_DIAGNOSTICO', async () => {
    const repo = makeRepo(makeOS('RECEBIDA'));
    const useCase = new IniciarOSUseCase(repo, makeClienteRepo(), makeNotificationService());

    const result = await useCase.execute('os-uuid-1');

    expect(result.status).toBe('EM_DIAGNOSTICO');
    expect(result.dataInicio).toBeDefined();
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when OS not found', async () => {
    const repo = makeRepo(null);
    const useCase = new IniciarOSUseCase(repo, makeClienteRepo(), makeNotificationService());

    await expect(useCase.execute('nao-existe')).rejects.toThrow(NotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError when OS is not RECEBIDA', async () => {
    const repo = makeRepo(makeOS('EM_DIAGNOSTICO'));
    const useCase = new IniciarOSUseCase(repo, makeClienteRepo(), makeNotificationService());

    await expect(useCase.execute('os-uuid-1')).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('notifies the client after the transition', async () => {
    const repo = makeRepo(makeOS('RECEBIDA'));
    const notificationService = makeNotificationService();
    const useCase = new IniciarOSUseCase(repo, makeClienteRepo(), notificationService);

    await useCase.execute('os-uuid-1');
    await new Promise((resolve) => setImmediate(resolve));

    expect(notificationService.enviarAtualizacaoStatus).toHaveBeenCalledWith(
      'joao@email.com',
      expect.objectContaining({ status: 'EM_DIAGNOSTICO' }),
    );
  });
});
