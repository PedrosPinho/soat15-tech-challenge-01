import { IPecaRepository, ListPecasFilter } from '@domain/repositories/peca.repository';
import { ListPecasDto, ListPecasResponseDto } from '@application/dtos/peca/peca.dto';
import { PecaMapper } from '@application/mappers/peca.mapper';

export class ListPecasUseCase {
  constructor(private readonly pecaRepo: IPecaRepository) {}

  async execute(dto: ListPecasDto): Promise<ListPecasResponseDto> {
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));

    const filter: ListPecasFilter = { ativo: true };
    if (dto.categoria) filter.categoria = dto.categoria;
    if (dto.search) filter.search = dto.search;

    const { pecas, total } = await this.pecaRepo.list(page, limit, filter);

    return {
      pecas: pecas.map(PecaMapper.toDto),
      total,
      page,
      limit,
    };
  }
}
