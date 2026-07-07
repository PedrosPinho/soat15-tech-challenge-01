import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { INotificationService } from '@domain/services/notification.service';
import { NotFoundError } from '@shared/errors/domain.error';
import { OrdemServicoResponseDto } from '@application/dtos/ordem-servico/ordem-servico.dto';
import { OrdemServicoMapper } from '@application/mappers/ordem-servico.mapper';
import { notificarMudancaStatusOS } from '@application/use-cases/ordem-servico/notificar-mudanca-status.helper';

export class AguardarAprovacaoOSUseCase {
  constructor(
    private readonly osRepo: IOrdemServicoRepository,
    private readonly clienteRepo: IClienteRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(id: string): Promise<OrdemServicoResponseDto> {
    const os = await this.osRepo.findById(id);
    if (!os) throw new NotFoundError(`Ordem de serviço ${id} não encontrada`);

    const atualizada = os.aguardarAprovacao();
    await this.osRepo.update(atualizada);
    notificarMudancaStatusOS(
      { clienteRepo: this.clienteRepo, notificationService: this.notificationService },
      atualizada,
    );
    return OrdemServicoMapper.toDto(atualizada);
  }
}
