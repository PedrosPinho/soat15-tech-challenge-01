import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { NotFoundError } from '@shared/errors/domain.error';

export class DeactivateClienteUseCase {
  constructor(private readonly clienteRepo: IClienteRepository) {}

  async execute(id: string): Promise<void> {
    const cliente = await this.clienteRepo.findById(id);
    if (!cliente) throw new NotFoundError(`Cliente ${id} não encontrado`);

    const deactivated = cliente.desativar();
    await this.clienteRepo.update(deactivated);
  }
}
