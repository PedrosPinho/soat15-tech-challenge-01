import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { UpdateVeiculoDto, VeiculoResponseDto } from '@application/dtos/veiculo/veiculo.dto';
import { VeiculoMapper } from '@application/mappers/veiculo.mapper';

export class UpdateVeiculoUseCase {
  constructor(private readonly veiculoRepo: IVeiculoRepository) {}

  async execute(id: string, dto: UpdateVeiculoDto): Promise<VeiculoResponseDto> {
    const veiculo = await this.veiculoRepo.findById(id);
    if (!veiculo) throw new NotFoundError(`Veículo ${id} não encontrado`);

    const updated = veiculo.atualizar({
      quilometragem: dto.quilometragem,
      cor: dto.cor,
      observacoes: dto.observacoes,
    });

    await this.veiculoRepo.update(updated);
    return VeiculoMapper.toDto(updated);
  }
}
