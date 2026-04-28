import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { OrdemServicoResponseDto } from '@application/dtos/ordem-servico/ordem-servico.dto';
import { OrdemServicoMapper } from '@application/mappers/ordem-servico.mapper';

export interface CancelarOSDto {
  id: string;
  motivo: string;
}

export class CancelarOSUseCase {
  constructor(private readonly osRepo: IOrdemServicoRepository) {}

  async execute(dto: CancelarOSDto): Promise<OrdemServicoResponseDto> {
    const os = await this.osRepo.findById(dto.id);
    if (!os) throw new NotFoundError(`Ordem de serviço ${dto.id} não encontrada`);

    const cancelada = os.cancelar(dto.motivo);
    await this.osRepo.update(cancelada);
    return OrdemServicoMapper.toDto(cancelada);
  }
}
