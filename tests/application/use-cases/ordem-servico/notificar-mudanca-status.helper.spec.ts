import { notificarMudancaStatusOS } from '@application/use-cases/ordem-servico/notificar-mudanca-status.helper';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { logger } from '@shared/logger';
import { makeCliente, makeClienteRepo, makeNotificationService } from './notificacao-test-helpers';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const newrelic = require('newrelic');

function makeOS(): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
    status: 'EM_DIAGNOSTICO',
  });
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('notificarMudancaStatusOS', () => {
  it('sends notification to the client email', async () => {
    const clienteRepo = makeClienteRepo(makeCliente({ email: 'cliente@email.com' }));
    const notificationService = makeNotificationService();

    notificarMudancaStatusOS({ clienteRepo, notificationService }, makeOS(), 'RECEBIDA');
    await flush();

    expect(clienteRepo.findById).toHaveBeenCalledWith('cliente-1');
    expect(notificationService.enviarAtualizacaoStatus).toHaveBeenCalledWith(
      'cliente@email.com',
      expect.objectContaining({ numeroOS: 'OS-20260428-0001' }),
    );
    expect(newrelic.recordCustomEvent).toHaveBeenCalledWith('OrdemServicoStatusChanged', {
      numeroOS: 'OS-20260428-0001',
      statusAnterior: 'RECEBIDA',
      statusNovo: 'EM_DIAGNOSTICO',
    });
  });

  it('does nothing when client is not found', async () => {
    const clienteRepo = makeClienteRepo(null);
    const notificationService = makeNotificationService();

    notificarMudancaStatusOS({ clienteRepo, notificationService }, makeOS(), 'RECEBIDA');
    await flush();

    expect(notificationService.enviarAtualizacaoStatus).not.toHaveBeenCalled();
  });

  it('swallows errors from the notification service', async () => {
    const clienteRepo = makeClienteRepo(makeCliente());
    const notificationService = makeNotificationService();
    notificationService.enviarAtualizacaoStatus.mockRejectedValue(new Error('smtp down'));
    const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    expect(() =>
      notificarMudancaStatusOS({ clienteRepo, notificationService }, makeOS(), 'RECEBIDA'),
    ).not.toThrow();
    await flush();

    expect(loggerErrorSpy).toHaveBeenCalled();
    loggerErrorSpy.mockRestore();
  });
});
