import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { INotificationService } from '@domain/services/notification.service';
import { logger } from '@shared/logger';

export interface NotificarMudancaStatusDeps {
  clienteRepo: IClienteRepository;
  notificationService: INotificationService;
}

export const notificarMudancaStatusOS = (deps: NotificarMudancaStatusDeps, os: OrdemServico): void => {
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
