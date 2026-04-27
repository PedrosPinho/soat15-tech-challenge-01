import { CreateClienteUseCase } from '@application/use-cases/cliente/create-cliente.use-case';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { ConflictError, ValidationError } from '@shared/errors/domain.error';

const validProps = {
  nome: 'João Silva',
  cpfCnpj: '52998224725',
  tipo: 'PESSOA_FISICA' as const,
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
};

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

describe('CreateClienteUseCase', () => {
  it('creates a cliente with valid data and returns it', async () => {
    const repo = makeRepo();
    const useCase = new CreateClienteUseCase(repo);

    const result = await useCase.execute(validProps);

    expect(result.id).toBeDefined();
    expect(result.nome).toBe('João Silva');
    expect(result.cpfCnpj).toBe('52998224725');
    expect(result.tipo).toBe('PESSOA_FISICA');
    expect(result.ativo).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictError when CPF already registered', async () => {
    const existingCliente = { id: 'existing-id' } as any;
    const repo = makeRepo({ findByCpfCnpj: jest.fn().mockResolvedValue(existingCliente) });
    const useCase = new CreateClienteUseCase(repo);

    await expect(useCase.execute(validProps)).rejects.toThrow(ConflictError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('throws ConflictError when email already registered', async () => {
    const existingCliente = { id: 'existing-id' } as any;
    const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(existingCliente) });
    const useCase = new CreateClienteUseCase(repo);

    await expect(useCase.execute(validProps)).rejects.toThrow(ConflictError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('propagates ValidationError from domain entity', async () => {
    const repo = makeRepo();
    const useCase = new CreateClienteUseCase(repo);

    await expect(useCase.execute({ ...validProps, nome: 'AB' })).rejects.toThrow(ValidationError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('creates PJ cliente with CNPJ', async () => {
    const repo = makeRepo();
    const useCase = new CreateClienteUseCase(repo);

    const result = await useCase.execute({
      ...validProps,
      cpfCnpj: '11222333000181',
      tipo: 'PESSOA_JURIDICA',
      email: 'empresa@email.com',
    });

    expect(result.tipo).toBe('PESSOA_JURIDICA');
    expect(result.cpfCnpj).toBe('11222333000181');
  });
});
