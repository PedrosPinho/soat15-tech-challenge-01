import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { NotFoundError, ConflictError } from '@shared/errors/domain.error';
import { UpdateClienteDto, ClienteResponseDto } from '@application/dtos/cliente/cliente.dto';
import { ClienteMapper } from '@application/mappers/cliente.mapper';

export class UpdateClienteUseCase {
  constructor(private readonly clienteRepo: IClienteRepository) {}

  async execute(id: string, dto: UpdateClienteDto): Promise<ClienteResponseDto> {
    const cliente = await this.clienteRepo.findById(id);
    if (!cliente) throw new NotFoundError(`Cliente ${id} não encontrado`);

    if (dto.email !== cliente.email) {
      const existingByEmail = await this.clienteRepo.findByEmail(dto.email);
      if (existingByEmail) throw new ConflictError('Email já cadastrado');
    }

    const updated = cliente.atualizarContato(dto.telefone, dto.email);
    await this.clienteRepo.update(updated);
    return ClienteMapper.toDto(updated);
  }
}
