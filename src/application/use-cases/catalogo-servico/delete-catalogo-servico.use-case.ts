import { ICatalogoServicoRepository } from '@domain/repositories/catalogo-servico.repository';
import { NotFoundError } from '@shared/errors/domain.error';

export class DeleteCatalogoServicoUseCase {
  constructor(private readonly repo: ICatalogoServicoRepository) {}

  async execute(id: string): Promise<void> {
    const servico = await this.repo.findById(id);
    if (!servico) throw new NotFoundError(`Serviço ${id} não encontrado`);

    const deletado = servico.deletar();
    await this.repo.update(deletado);
  }
}
