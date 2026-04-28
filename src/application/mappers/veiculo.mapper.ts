import { Veiculo } from '@domain/entities/veiculo.entity';
import { VeiculoResponseDto } from '@application/dtos/veiculo/veiculo.dto';

export class VeiculoMapper {
  static toDto(veiculo: Veiculo): VeiculoResponseDto {
    return {
      id: veiculo.id,
      clienteId: veiculo.clienteId,
      placa: veiculo.placa.value,
      placaFormatada: veiculo.placa.formatted,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      quilometragem: veiculo.quilometragem,
      cor: veiculo.cor,
      chassi: veiculo.chassi,
      renavam: veiculo.renavam,
      observacoes: veiculo.observacoes,
      criadoEm: veiculo.criadoEm,
    };
  }
}
