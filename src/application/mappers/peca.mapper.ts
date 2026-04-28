import { Peca } from '@domain/entities/peca.entity';
import { PecaResponseDto } from '@application/dtos/peca/peca.dto';

export class PecaMapper {
  static toDto(peca: Peca): PecaResponseDto {
    return {
      id: peca.id,
      codigo: peca.codigo,
      descricao: peca.descricao,
      categoria: peca.categoria,
      precoCompra: peca.precoCompra,
      precoVenda: peca.precoVenda,
      margemLucro: parseFloat(peca.margemLucro.toFixed(2)),
      unidadeMedida: peca.unidadeMedida,
      nivelMinimo: peca.nivelMinimo,
      nivelMaximo: peca.nivelMaximo,
      ativo: peca.ativo,
    };
  }
}
