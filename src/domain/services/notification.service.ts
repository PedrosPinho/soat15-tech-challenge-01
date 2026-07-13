import { OrdemServico } from '@domain/entities/ordem-servico.entity';

export interface INotificationService {
  enviarAtualizacaoStatus(destinatario: string, os: OrdemServico): Promise<void>;
}
