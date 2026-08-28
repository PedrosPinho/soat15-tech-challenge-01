import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import { INotificationService } from '@domain/services/notification.service';

const STATUS_LABEL: Record<StatusOS, string> = {
  RECEBIDA: 'Recebida',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação do orçamento',
  EM_EXECUCAO: 'Em execução',
  FINALIZADA: 'Finalizada',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

/**
 * Implementação serverless de `INotificationService` via Amazon SES. Segue a
 * mesma forma de `NodemailerNotificationService` (construtor sem argumentos,
 * config lida de `process.env`) para que a escolha entre as duas seja só uma
 * troca de classe no factory — ver `ADR-005`. Região e credenciais vêm da
 * cadeia padrão do SDK (`AWS_REGION`, variáveis de ambiente/`LabRole` via IMDS
 * quando rodando no EKS).
 */
export class SesNotificationService implements INotificationService {
  private readonly client: SESClient;
  private readonly from: string;

  constructor() {
    this.client = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
    this.from = process.env.SES_FROM_EMAIL ?? 'no-reply@oficina.com';
  }

  async enviarAtualizacaoStatus(destinatario: string, os: OrdemServico): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        Source: this.from,
        Destination: { ToAddresses: [destinatario] },
        Message: {
          Subject: { Data: `Atualização da OS ${os.numeroOS}` },
          Body: {
            Text: {
              Data: `Sua ordem de serviço ${os.numeroOS} está com o status: ${STATUS_LABEL[os.status]}.`,
            },
          },
        },
      }),
    );
  }
}
