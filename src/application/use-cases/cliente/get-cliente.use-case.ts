import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { ClienteResponseDto } from '@application/dtos/cliente/cliente.dto';
import { ClienteMapper } from '@application/mappers/cliente.mapper';

export class GetClienteUseCase {
  constructor(private readonly clienteRepo: IClienteRepository) {}

  async execute(id: string): Promise<ClienteResponseDto> {
    const cliente = await this.clienteRepo.findById(id);
    if (!cliente) throw new NotFoundError(`Cliente ${id} não encontrado`);
    return ClienteMapper.toDto(cliente);
  }
}
