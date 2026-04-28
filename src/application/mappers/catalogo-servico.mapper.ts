import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';
import { CatalogoServicoResponseDto } from '@application/dtos/catalogo-servico/catalogo-servico.dto';

export class CatalogoServicoMapper {
  static toDto(servico: CatalogoServico): CatalogoServicoResponseDto {
    return {
      id: servico.id,
      descricao: servico.descricao,
      preco: servico.preco,
      tempoEstimado: servico.tempoEstimado,
      ativo: servico.ativo,
    };
  }
}
