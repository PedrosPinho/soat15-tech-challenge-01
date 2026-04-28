import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import {
  ListVeiculosByClienteDto,
  ListVeiculosResponseDto,
} from '@application/dtos/veiculo/veiculo.dto';
import { VeiculoMapper } from '@application/mappers/veiculo.mapper';

export class ListVeiculosByClienteUseCase {
  constructor(
    private readonly veiculoRepo: IVeiculoRepository,
    private readonly clienteRepo: IClienteRepository,
  ) {}

  async execute(dto: ListVeiculosByClienteDto): Promise<ListVeiculosResponseDto> {
    const cliente = await this.clienteRepo.findById(dto.clienteId);
    if (!cliente) throw new NotFoundError(`Cliente ${dto.clienteId} não encontrado`);

    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));

    const { veiculos, total } = await this.veiculoRepo.findByClienteId(dto.clienteId, page, limit);

    return {
      veiculos: veiculos.map(VeiculoMapper.toDto),
      total,
      page,
      limit,
    };
  }
}
