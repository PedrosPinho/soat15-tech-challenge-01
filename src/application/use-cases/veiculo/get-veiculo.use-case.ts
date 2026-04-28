import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { VeiculoResponseDto } from '@application/dtos/veiculo/veiculo.dto';
import { VeiculoMapper } from '@application/mappers/veiculo.mapper';

export class GetVeiculoUseCase {
  constructor(private readonly veiculoRepo: IVeiculoRepository) {}

  async execute(id: string): Promise<VeiculoResponseDto> {
    const veiculo = await this.veiculoRepo.findById(id);
    if (!veiculo) throw new NotFoundError(`Veículo ${id} não encontrado`);
    return VeiculoMapper.toDto(veiculo);
  }
}
