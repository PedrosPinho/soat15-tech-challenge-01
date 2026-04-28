import { IPecaRepository } from '@domain/repositories/peca.repository';
import { NotFoundError } from '@shared/errors/domain.error';

export class DeactivatePecaUseCase {
  constructor(private readonly pecaRepo: IPecaRepository) {}

  async execute(id: string): Promise<void> {
    const peca = await this.pecaRepo.findById(id);
    if (!peca) throw new NotFoundError(`Peça ${id} não encontrada`);

    await this.pecaRepo.update(peca.desativar());
  }
}
