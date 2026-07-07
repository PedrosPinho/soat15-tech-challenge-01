import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { INotificationService } from '@domain/services/notification.service';

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
      console.error(`Falha ao notificar cliente da OS ${os.numeroOS}:`, err);
    });
};
