import { Peca } from '@domain/entities/peca.entity';
import { IPecaRepository } from '@domain/repositories/peca.repository';
import { ConflictError } from '@shared/errors/domain.error';
import { CreatePecaDto, PecaResponseDto } from '@application/dtos/peca/peca.dto';
import { PecaMapper } from '@application/mappers/peca.mapper';

export class CreatePecaUseCase {
  constructor(private readonly pecaRepo: IPecaRepository) {}

  async execute(dto: CreatePecaDto): Promise<PecaResponseDto> {
    const existing = await this.pecaRepo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictError(`Código ${dto.codigo} já cadastrado`);

    const peca = Peca.create(dto);
    await this.pecaRepo.save(peca);
    return PecaMapper.toDto(peca);
  }
}
