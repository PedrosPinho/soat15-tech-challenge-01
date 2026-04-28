import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import {
  ListOrdensServicoDto,
  ListOrdensServicoResponseDto,
} from '@application/dtos/ordem-servico/ordem-servico.dto';
import { OrdemServicoMapper } from '@application/mappers/ordem-servico.mapper';

export class ListOrdensServicoUseCase {
  constructor(private readonly osRepo: IOrdemServicoRepository) {}

  async execute(dto: ListOrdensServicoDto): Promise<ListOrdensServicoResponseDto> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const filter = {
      status: dto.status,
      clienteId: dto.clienteId,
      veiculoId: dto.veiculoId,
    };

    const { ordens, total } = await this.osRepo.list(page, limit, filter);
    return {
      ordens: ordens.map(OrdemServicoMapper.toDto),
      total,
      page,
      limit,
    };
  }
}
