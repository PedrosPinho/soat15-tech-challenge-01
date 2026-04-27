import { DeactivateClienteUseCase } from '@application/use-cases/cliente/deactivate-cliente.use-case';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { Cliente } from '@domain/entities/cliente.entity';
import { NotFoundError } from '@shared/errors/domain.error';

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

describe('DeactivateClienteUseCase', () => {
  it('deactivates an active cliente', async () => {
    const cliente = makeCliente();
    expect(cliente.ativo).toBe(true);

    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(cliente) });
    const useCase = new DeactivateClienteUseCase(repo);

    await useCase.execute(cliente.id);

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updatedCliente = (repo.update as jest.Mock).mock.calls[0][0] as Cliente;
    expect(updatedCliente.ativo).toBe(false);
  });

  it('throws NotFoundError when cliente does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new DeactivateClienteUseCase(repo);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(NotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('is idempotent — deactivating an already-inactive cliente does not throw', async () => {
    const cliente = makeCliente().desativar();
    expect(cliente.ativo).toBe(false);

    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(cliente) });
    const useCase = new DeactivateClienteUseCase(repo);

    await expect(useCase.execute(cliente.id)).resolves.not.toThrow();
    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});
