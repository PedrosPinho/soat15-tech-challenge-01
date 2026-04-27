import { UpdateClienteUseCase } from '@application/use-cases/cliente/update-cliente.use-case';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { Cliente } from '@domain/entities/cliente.entity';
import { NotFoundError, ConflictError, ValidationError } from '@shared/errors/domain.error';

function makeCliente(email = 'joao@email.com'): Cliente {
  return Cliente.create({
    nome: 'João Silva',
    cpfCnpj: '52998224725',
    tipo: 'PESSOA_FISICA',
    telefone: '11987654321',
    email,
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

describe('UpdateClienteUseCase', () => {
  it('updates telefone and email when valid', async () => {
    const cliente = makeCliente();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(cliente) });
    const useCase = new UpdateClienteUseCase(repo);

    const result = await useCase.execute(cliente.id, {
      telefone: '11999999999',
      email: 'novo@email.com',
    });

    expect(result.telefone).toBe('11999999999');
    expect(result.email).toBe('novo@email.com');
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when cliente does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new UpdateClienteUseCase(repo);

    await expect(
      useCase.execute('non-existent', { telefone: '11999999999', email: 'a@b.com' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when new email is already taken by another cliente', async () => {
    const cliente = makeCliente('joao@email.com');
    const otherCliente = makeCliente('outro@email.com');
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(cliente),
      findByEmail: jest.fn().mockResolvedValue(otherCliente),
    });
    const useCase = new UpdateClienteUseCase(repo);

    await expect(
      useCase.execute(cliente.id, { telefone: '11999999999', email: 'outro@email.com' }),
    ).rejects.toThrow(ConflictError);
  });

  it('allows keeping the same email', async () => {
    const cliente = makeCliente('joao@email.com');
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(cliente),
      findByEmail: jest.fn().mockResolvedValue(cliente),
    });
    const useCase = new UpdateClienteUseCase(repo);

    const result = await useCase.execute(cliente.id, {
      telefone: '11999999999',
      email: 'joao@email.com',
    });

    expect(result.telefone).toBe('11999999999');
    expect(repo.update).toHaveBeenCalled();
  });

  it('propagates ValidationError for invalid email', async () => {
    const cliente = makeCliente();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(cliente) });
    const useCase = new UpdateClienteUseCase(repo);

    await expect(
      useCase.execute(cliente.id, { telefone: '11999999999', email: 'not-an-email' }),
    ).rejects.toThrow(ValidationError);
  });
});
