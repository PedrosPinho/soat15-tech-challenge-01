import { ICatalogoServicoRepository } from '@domain/repositories/catalogo-servico.repository';
import { CatalogoServicoResponseDto } from '@application/dtos/catalogo-servico/catalogo-servico.dto';
import { CatalogoServicoMapper } from '@application/mappers/catalogo-servico.mapper';
import { NotFoundError } from '@shared/errors/domain.error';

export class GetCatalogoServicoUseCase {
  constructor(private readonly repo: ICatalogoServicoRepository) {}

  async execute(id: string): Promise<CatalogoServicoResponseDto> {
    const servico = await this.repo.findById(id);
    if (!servico) throw new NotFoundError(`Serviço ${id} não encontrado`);
    return CatalogoServicoMapper.toDto(servico);
  }
}
