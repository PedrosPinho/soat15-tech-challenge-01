import { GetClienteUseCase } from '@application/use-cases/cliente/get-cliente.use-case';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { Cliente } from '@domain/entities/cliente.entity';

function makeCliente(): Cliente {
  return Cliente.create({
    nome: 'João Silva',
    cpfCnpj: '52998224725',
    tipo: 'PESSOA_FISICA',
    telefone: '11987654321',
    email: 'joao@email.com',
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

function makeRepo(overrides: Partial<IClienteRepository> = {}): IClienteRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByCpfCnpj: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

describe('GetClienteUseCase', () => {
  it('returns cliente when found', async () => {
    const cliente = makeCliente();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(cliente) });
    const useCase = new GetClienteUseCase(repo);

    const result = await useCase.execute(cliente.id);

    expect(result.id).toBe(cliente.id);
    expect(result.nome).toBe('João Silva');
  });

  it('throws NotFoundError when cliente does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new GetClienteUseCase(repo);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(NotFoundError);
  });
});
