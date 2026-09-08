import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { INotificationService } from '@domain/services/notification.service';
import { logger } from '@shared/logger';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const newrelic = require('newrelic');

export interface NotificarMudancaStatusDeps {
  clienteRepo: IClienteRepository;
  notificationService: INotificationService;
}

/**
 * Chamado por todos os use-cases de transição de status (RFC-004) -- ponto
 * único para emitir o evento customizado `OrdemServicoStatusChanged`, usado
 * pelo dashboard de "tempo médio por status". `newrelic.recordCustomEvent` é
 * um no-op seguro quando o agente está desabilitado (sem license key).
 */
export const notificarMudancaStatusOS = (
  deps: NotificarMudancaStatusDeps,
  os: OrdemServico,
  statusAnterior: StatusOS,
): void => {
  newrelic.recordCustomEvent('OrdemServicoStatusChanged', {
    numeroOS: os.numeroOS,
    statusAnterior,
    statusNovo: os.status,
  });

  deps.clienteRepo
    .findById(os.clienteId)
    .then((cliente) => {
      if (!cliente) return undefined;
      return deps.notificationService.enviarAtualizacaoStatus(cliente.email, os);
    })
    .catch((err) => {
      logger.error({ err, numeroOS: os.numeroOS }, 'Falha ao notificar cliente da OS');
    });
};
