import { ICatalogoServicoRepository } from '@domain/repositories/catalogo-servico.repository';
import { ListCatalogoServicoDto, ListCatalogoServicoResponseDto } from '@application/dtos/catalogo-servico/catalogo-servico.dto';
import { CatalogoServicoMapper } from '@application/mappers/catalogo-servico.mapper';

export class ListCatalogoServicoUseCase {
  constructor(private readonly repo: ICatalogoServicoRepository) {}

  async execute(dto: ListCatalogoServicoDto): Promise<ListCatalogoServicoResponseDto> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const { servicos, total } = await this.repo.list(page, limit, {
      ativo: true,
      search: dto.search,
    });

    return {
      servicos: servicos.map((s) => CatalogoServicoMapper.toDto(s)),
      total,
      page,
      limit,
    };
  }
}
