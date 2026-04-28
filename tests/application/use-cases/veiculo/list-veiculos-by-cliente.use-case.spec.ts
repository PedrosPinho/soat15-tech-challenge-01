import { ListVeiculosByClienteUseCase } from '@application/use-cases/veiculo/list-veiculos-by-cliente.use-case';
import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { Veiculo } from '@domain/entities/veiculo.entity';
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
      logradouro: 'Rua A', numero: '123', bairro: 'Centro',
      cidade: 'São Paulo', estado: 'SP', cep: '01234567',
    },
  });
}

function makeVeiculo(placa: string): Veiculo {
  return Veiculo.create({
    clienteId: 'client-uuid',
    placa,
    marca: 'Honda',
    modelo: 'Civic',
    ano: 2020,
  });
}

function makeVeiculoRepo(overrides: Partial<IVeiculoRepository> = {}): IVeiculoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByPlaca: jest.fn().mockResolvedValue(null),
    findByClienteId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

function makeClienteRepo(overrides: Partial<IClienteRepository> = {}): IClienteRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(makeCliente()),
    findByCpfCnpj: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

describe('ListVeiculosByClienteUseCase', () => {
  it('returns paginated list for an existing cliente', async () => {
    const veiculos = [makeVeiculo('ABC1234'), makeVeiculo('XYZ9876')];
    const veiculoRepo = makeVeiculoRepo({
      findByClienteId: jest.fn().mockResolvedValue({ veiculos, total: 5 }),
    });
    const clienteRepo = makeClienteRepo();
    const useCase = new ListVeiculosByClienteUseCase(veiculoRepo, clienteRepo);

    const result = await useCase.execute({ clienteId: 'client-uuid', page: 1, limit: 2 });

    expect(result.veiculos).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(veiculoRepo.findByClienteId).toHaveBeenCalledWith('client-uuid', 1, 2);
  });

  it('throws NotFoundError when cliente does not exist', async () => {
    const veiculoRepo = makeVeiculoRepo();
    const clienteRepo = makeClienteRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new ListVeiculosByClienteUseCase(veiculoRepo, clienteRepo);

    await expect(
      useCase.execute({ clienteId: 'non-existent', page: 1, limit: 10 }),
    ).rejects.toThrow(NotFoundError);
    expect(veiculoRepo.findByClienteId).not.toHaveBeenCalled();
  });

  it('uses defaults for page and limit', async () => {
    const veiculoRepo = makeVeiculoRepo({
      findByClienteId: jest.fn().mockResolvedValue({ veiculos: [], total: 0 }),
    });
    const clienteRepo = makeClienteRepo();
    const useCase = new ListVeiculosByClienteUseCase(veiculoRepo, clienteRepo);

    await useCase.execute({ clienteId: 'client-uuid' });

    expect(veiculoRepo.findByClienteId).toHaveBeenCalledWith('client-uuid', 1, 20);
  });
});
