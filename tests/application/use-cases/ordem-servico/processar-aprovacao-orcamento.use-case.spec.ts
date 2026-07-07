import { ProcessarAprovacaoOrcamentoUseCase } from '@application/use-cases/ordem-servico/processar-aprovacao-orcamento.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';
import { makeClienteRepo, makeNotificationService } from './notificacao-test-helpers';

function makeOS(status: StatusOS = 'AGUARDANDO_APROVACAO'): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
    status,
  });
}

function makeRepo(
  os: OrdemServico | null,
  overrides: Partial<IOrdemServicoRepository> = {},
): IOrdemServicoRepository {
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

describe('ProcessarAprovacaoOrcamentoUseCase', () => {
  it('approves the OS when aprovado is true', async () => {
    const repo = makeRepo(makeOS('AGUARDANDO_APROVACAO'));
    const useCase = new ProcessarAprovacaoOrcamentoUseCase(
      repo,
      makeClienteRepo(),
      makeNotificationService(),
    );

    const result = await useCase.execute('os-uuid-1', { aprovado: true });

    expect(result.status).toBe('EM_EXECUCAO');
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('cancels the OS with a default motivo when aprovado is false without motivo', async () => {
    const repo = makeRepo(makeOS('AGUARDANDO_APROVACAO'));
    const useCase = new ProcessarAprovacaoOrcamentoUseCase(
      repo,
      makeClienteRepo(),
      makeNotificationService(),
    );

    const result = await useCase.execute('os-uuid-1', { aprovado: false });

    expect(result.status).toBe('CANCELADA');
    expect(result.motivoCancelamento).toBe('Orçamento recusado pelo cliente');
  });

  it('cancels the OS with the given motivo when aprovado is false', async () => {
    const repo = makeRepo(makeOS('AGUARDANDO_APROVACAO'));
    const useCase = new ProcessarAprovacaoOrcamentoUseCase(
      repo,
      makeClienteRepo(),
      makeNotificationService(),
    );

    const result = await useCase.execute('os-uuid-1', {
      aprovado: false,
      motivo: 'Valor acima do esperado',
    });

    expect(result.motivoCancelamento).toBe('Valor acima do esperado');
  });

  it('throws NotFoundError when OS not found', async () => {
    const repo = makeRepo(null);
    const useCase = new ProcessarAprovacaoOrcamentoUseCase(
      repo,
      makeClienteRepo(),
      makeNotificationService(),
    );

    await expect(useCase.execute('nao-existe', { aprovado: true })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('throws ValidationError when OS is not AGUARDANDO_APROVACAO', async () => {
    const repo = makeRepo(makeOS('RECEBIDA'));
    const useCase = new ProcessarAprovacaoOrcamentoUseCase(
      repo,
      makeClienteRepo(),
      makeNotificationService(),
    );

    await expect(useCase.execute('os-uuid-1', { aprovado: true })).rejects.toThrow(
      ValidationError,
    );
  });

  it('notifies the client after processing the approval', async () => {
    const repo = makeRepo(makeOS('AGUARDANDO_APROVACAO'));
    const notificationService = makeNotificationService();
    const useCase = new ProcessarAprovacaoOrcamentoUseCase(
      repo,
      makeClienteRepo(),
      notificationService,
    );

    await useCase.execute('os-uuid-1', { aprovado: true });
    await new Promise((resolve) => setImmediate(resolve));

    expect(notificationService.enviarAtualizacaoStatus).toHaveBeenCalledWith(
      'joao@email.com',
      expect.objectContaining({ status: 'EM_EXECUCAO' }),
    );
  });
});
