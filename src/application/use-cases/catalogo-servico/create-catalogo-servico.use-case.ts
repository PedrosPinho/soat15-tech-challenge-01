import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';
import { ICatalogoServicoRepository } from '@domain/repositories/catalogo-servico.repository';
import {
  CreateCatalogoServicoDto,
  CatalogoServicoResponseDto,
} from '@application/dtos/catalogo-servico/catalogo-servico.dto';
import { CatalogoServicoMapper } from '@application/mappers/catalogo-servico.mapper';

export class CreateCatalogoServicoUseCase {
  constructor(private readonly repo: ICatalogoServicoRepository) {}

  async execute(dto: CreateCatalogoServicoDto): Promise<CatalogoServicoResponseDto> {
    const servico = CatalogoServico.create({
      descricao: dto.descricao,
      preco: dto.preco,
      tempoEstimado: dto.tempoEstimado,
    });
    await this.repo.save(servico);
    return CatalogoServicoMapper.toDto(servico);
  }
}
