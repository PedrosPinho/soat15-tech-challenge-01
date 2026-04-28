import { ICatalogoServicoRepository } from '@domain/repositories/catalogo-servico.repository';
import { UpdateCatalogoServicoDto, CatalogoServicoResponseDto } from '@application/dtos/catalogo-servico/catalogo-servico.dto';
import { CatalogoServicoMapper } from '@application/mappers/catalogo-servico.mapper';
import { NotFoundError } from '@shared/errors/domain.error';

export class UpdateCatalogoServicoUseCase {
  constructor(private readonly repo: ICatalogoServicoRepository) {}

  async execute(id: string, dto: UpdateCatalogoServicoDto): Promise<CatalogoServicoResponseDto> {
    const servico = await this.repo.findById(id);
    if (!servico) throw new NotFoundError(`Serviço ${id} não encontrado`);

    const atualizado = servico.editar({
      descricao: dto.descricao,
      preco: dto.preco,
      tempoEstimado: dto.tempoEstimado,
    });
    await this.repo.update(atualizado);
    return CatalogoServicoMapper.toDto(atualizado);
  }
}
