import nodemailer, { Transporter } from 'nodemailer';
import { INotificationService } from '@domain/services/notification.service';
import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';

const STATUS_LABEL: Record<StatusOS, string> = {
  RECEBIDA: 'Recebida',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação do orçamento',
  EM_EXECUCAO: 'Em execução',
  FINALIZADA: 'Finalizada',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

export class NodemailerNotificationService implements INotificationService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    this.from = process.env.SMTP_FROM ?? 'no-reply@oficina.com';
  }

  async enviarAtualizacaoStatus(destinatario: string, os: OrdemServico): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: destinatario,
      subject: `Atualização da OS ${os.numeroOS}`,
      text: `Sua ordem de serviço ${os.numeroOS} está com o status: ${STATUS_LABEL[os.status]}.`,
    });
  }
}
