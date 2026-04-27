import { Cliente } from '@domain/entities/cliente.entity';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { ConflictError } from '@shared/errors/domain.error';
import { CreateClienteDto, ClienteResponseDto } from '@application/dtos/cliente/cliente.dto';
import { ClienteMapper } from '@application/mappers/cliente.mapper';

export class CreateClienteUseCase {
  constructor(private readonly clienteRepo: IClienteRepository) {}

  async execute(dto: CreateClienteDto): Promise<ClienteResponseDto> {
    const [existingByCpfCnpj, existingByEmail] = await Promise.all([
      this.clienteRepo.findByCpfCnpj(dto.cpfCnpj.replace(/\D/g, '')),
      this.clienteRepo.findByEmail(dto.email),
    ]);

    if (existingByCpfCnpj) throw new ConflictError('CPF/CNPJ já cadastrado');
    if (existingByEmail) throw new ConflictError('Email já cadastrado');

    const cliente = Cliente.create(dto);
    await this.clienteRepo.save(cliente);
    return ClienteMapper.toDto(cliente);
  }
}
