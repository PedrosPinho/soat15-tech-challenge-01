import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { INotificationService } from '@domain/services/notification.service';
import { NotFoundError } from '@shared/errors/domain.error';
import { OrdemServicoResponseDto } from '@application/dtos/ordem-servico/ordem-servico.dto';
import { OrdemServicoMapper } from '@application/mappers/ordem-servico.mapper';
import { notificarMudancaStatusOS } from '@application/use-cases/ordem-servico/notificar-mudanca-status.helper';

export interface CancelarOSDto {
  id: string;
  motivo: string;
}

export class CancelarOSUseCase {
  constructor(
    private readonly osRepo: IOrdemServicoRepository,
    private readonly clienteRepo: IClienteRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(dto: CancelarOSDto): Promise<OrdemServicoResponseDto> {
    const os = await this.osRepo.findById(dto.id);
    if (!os) throw new NotFoundError(`Ordem de serviço ${dto.id} não encontrada`);

    const cancelada = os.cancelar(dto.motivo);
    await this.osRepo.update(cancelada);
    notificarMudancaStatusOS(
      { clienteRepo: this.clienteRepo, notificationService: this.notificationService },
      cancelada,
    );
    return OrdemServicoMapper.toDto(cancelada);
  }
}
