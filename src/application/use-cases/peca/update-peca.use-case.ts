import { Peca } from '@domain/entities/peca.entity';
import { IPecaRepository } from '@domain/repositories/peca.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { UpdatePecaDto, PecaResponseDto } from '@application/dtos/peca/peca.dto';
import { PecaMapper } from '@application/mappers/peca.mapper';

export class UpdatePecaUseCase {
  constructor(private readonly pecaRepo: IPecaRepository) {}

  async execute(id: string, dto: UpdatePecaDto): Promise<PecaResponseDto> {
    const peca = await this.pecaRepo.findById(id);
    if (!peca) throw new NotFoundError(`Peça ${id} não encontrada`);

    // atualizarPreco validates precoVenda >= precoCompra
    let updated = peca.atualizarPreco(dto.precoCompra, dto.precoVenda);

    // Recreate with updated thresholds if provided (Peca.create validates nivelMaximo > nivelMinimo)
    if (dto.nivelMinimo !== undefined || dto.nivelMaximo !== undefined) {
      updated = Peca.create({
        id: updated.id,
        codigo: updated.codigo,
        descricao: updated.descricao,
        categoria: updated.categoria,
        precoCompra: updated.precoCompra,
        precoVenda: updated.precoVenda,
        unidadeMedida: updated.unidadeMedida,
        nivelMinimo: dto.nivelMinimo ?? updated.nivelMinimo,
        nivelMaximo: dto.nivelMaximo ?? updated.nivelMaximo,
        ativo: updated.ativo,
      });
    }

    await this.pecaRepo.update(updated);
    return PecaMapper.toDto(updated);
  }
}
