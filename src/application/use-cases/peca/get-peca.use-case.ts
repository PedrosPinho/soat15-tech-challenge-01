import { IPecaRepository } from '@domain/repositories/peca.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { PecaResponseDto } from '@application/dtos/peca/peca.dto';
import { PecaMapper } from '@application/mappers/peca.mapper';

export class GetPecaUseCase {
  constructor(private readonly pecaRepo: IPecaRepository) {}

  async execute(id: string): Promise<PecaResponseDto> {
    const peca = await this.pecaRepo.findById(id);
    if (!peca) throw new NotFoundError(`Peça ${id} não encontrada`);
    return PecaMapper.toDto(peca);
  }
}
