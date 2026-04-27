import { ListClientesUseCase } from '@application/use-cases/cliente/list-clientes.use-case';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { Cliente } from '@domain/entities/cliente.entity';

function makeCliente(email: string): Cliente {
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

describe('ListClientesUseCase', () => {
  it('returns paginated list with total', async () => {
    const clientes = [makeCliente('a@email.com'), makeCliente('b@email.com')];
    const repo = makeRepo({ list: jest.fn().mockResolvedValue({ clientes, total: 10 }) });
    const useCase = new ListClientesUseCase(repo);

    const result = await useCase.execute({ page: 1, limit: 2 });

    expect(result.clientes).toHaveLength(2);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(repo.list).toHaveBeenCalledWith(1, 2);
  });

  it('uses defaults when page and limit are not provided', async () => {
    const repo = makeRepo({ list: jest.fn().mockResolvedValue({ clientes: [], total: 0 }) });
    const useCase = new ListClientesUseCase(repo);

    await useCase.execute({});

    expect(repo.list).toHaveBeenCalledWith(1, 20);
  });

  it('clamps page to minimum 1', async () => {
    const repo = makeRepo({ list: jest.fn().mockResolvedValue({ clientes: [], total: 0 }) });
    const useCase = new ListClientesUseCase(repo);

    await useCase.execute({ page: 0 });

    expect(repo.list).toHaveBeenCalledWith(1, 20);
  });

  it('clamps limit to maximum 100', async () => {
    const repo = makeRepo({ list: jest.fn().mockResolvedValue({ clientes: [], total: 0 }) });
    const useCase = new ListClientesUseCase(repo);

    await useCase.execute({ limit: 999 });

    expect(repo.list).toHaveBeenCalledWith(1, 100);
  });
});
