import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { ListClientesDto, ListClientesResponseDto } from '@application/dtos/cliente/cliente.dto';
import { ClienteMapper } from '@application/mappers/cliente.mapper';

export class ListClientesUseCase {
  constructor(private readonly clienteRepo: IClienteRepository) {}

  async execute(dto: ListClientesDto): Promise<ListClientesResponseDto> {
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));

    const { clientes, total } = await this.clienteRepo.list(page, limit);

    return {
      clientes: clientes.map(ClienteMapper.toDto),
      total,
      page,
      limit,
    };
  }
}
