import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { OrdemServicoResponseDto } from '@application/dtos/ordem-servico/ordem-servico.dto';
import { OrdemServicoMapper } from '@application/mappers/ordem-servico.mapper';

export class EntregarOSUseCase {
  constructor(private readonly osRepo: IOrdemServicoRepository) {}

  async execute(id: string): Promise<OrdemServicoResponseDto> {
    const os = await this.osRepo.findById(id);
    if (!os) throw new NotFoundError(`Ordem de serviço ${id} não encontrada`);

    const atualizada = os.entregar();
    await this.osRepo.update(atualizada);
    return OrdemServicoMapper.toDto(atualizada);
  }
}
