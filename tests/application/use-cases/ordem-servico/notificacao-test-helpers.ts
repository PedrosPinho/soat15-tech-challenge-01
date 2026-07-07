import { Cliente } from '@domain/entities/cliente.entity';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { INotificationService } from '@domain/services/notification.service';

export const CLIENTE_ID = 'cliente-1';

export function makeCliente(overrides: Partial<{ id: string; email: string }> = {}): Cliente {
  return Cliente.create({
    id: overrides.id ?? CLIENTE_ID,
    nome: 'João Silva',
    cpfCnpj: '52998224725',
    tipo: 'PESSOA_FISICA',
    telefone: '11987654321',
    email: overrides.email ?? 'joao@email.com',
    endereco: {
      logradouro: 'Rua A',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234567',
    },
  });
}

export function makeClienteRepo(cliente: Cliente | null = makeCliente()): IClienteRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(cliente),
    findByCpfCnpj: jest.fn(),
    findByEmail: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

export function makeNotificationService(): jest.Mocked<INotificationService> {
  return {
    enviarAtualizacaoStatus: jest.fn().mockResolvedValue(undefined),
  };
}
