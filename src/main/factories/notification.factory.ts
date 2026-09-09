import { INotificationService } from '@domain/services/notification.service';
import { NodemailerNotificationService } from '@infrastructure/notifications/nodemailer-notification.service';
import { SesNotificationService } from '@infrastructure/notifications/ses-notification.service';

/**
 * Seleciona a implementação de `INotificationService` por variável de ambiente
 * (`NOTIFICATION_PROVIDER=ses` | `smtp`, default `smtp`) — ver `ADR-005`.
 * `smtp` (Nodemailer/Mailhog) é o default para manter o ambiente de
 * desenvolvimento local funcionando sem configuração adicional; produção liga
 * `NOTIFICATION_PROVIDER=ses` explicitamente. Se o SES estiver bloqueado/sandbox
 * no Learner Lab, o mesmo default `smtp` serve como contingência apontando para
 * um SMTP externo, atrás da mesma port — sem precisar trocar código.
 */
export const makeNotificationService = (): INotificationService =>
  process.env.NOTIFICATION_PROVIDER === 'ses'
    ? new SesNotificationService()
    : new NodemailerNotificationService();
