import { Veiculo } from '@domain/entities/veiculo.entity';
import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { NotFoundError, ConflictError } from '@shared/errors/domain.error';
import { CreateVeiculoDto, VeiculoResponseDto } from '@application/dtos/veiculo/veiculo.dto';
import { VeiculoMapper } from '@application/mappers/veiculo.mapper';

export class CreateVeiculoUseCase {
  constructor(
    private readonly veiculoRepo: IVeiculoRepository,
    private readonly clienteRepo: IClienteRepository,
  ) {}

  async execute(dto: CreateVeiculoDto): Promise<VeiculoResponseDto> {
    const cliente = await this.clienteRepo.findById(dto.clienteId);
    if (!cliente) throw new NotFoundError(`Cliente ${dto.clienteId} não encontrado`);

    const placaNormalizada = dto.placa.replace(/[-\s]/g, '').toUpperCase();
    const existing = await this.veiculoRepo.findByPlaca(placaNormalizada);
    if (existing) throw new ConflictError(`Placa ${dto.placa} já cadastrada`);

    const veiculo = Veiculo.create(dto);
    await this.veiculoRepo.save(veiculo);
    return VeiculoMapper.toDto(veiculo);
  }
}
