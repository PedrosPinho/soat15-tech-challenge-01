import { CreateVeiculoUseCase } from '@application/use-cases/veiculo/create-veiculo.use-case';
import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { Cliente } from '@domain/entities/cliente.entity';
import { ConflictError, NotFoundError, ValidationError } from '@shared/errors/domain.error';

const validDto = {
  clienteId: 'client-uuid',
  placa: 'ABC1D23',
  marca: 'Honda',
  modelo: 'Civic',
  ano: 2020,
  quilometragem: 50000,
};

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

describe('CreateVeiculoUseCase', () => {
  it('creates a vehicle when cliente exists and placa is available', async () => {
    const veiculoRepo = makeVeiculoRepo();
    const clienteRepo = makeClienteRepo();
    const useCase = new CreateVeiculoUseCase(veiculoRepo, clienteRepo);

    const result = await useCase.execute(validDto);

    expect(result.id).toBeDefined();
    expect(result.placa).toBe('ABC1D23');
    expect(result.clienteId).toBe('client-uuid');
    expect(veiculoRepo.save).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when cliente does not exist', async () => {
    const veiculoRepo = makeVeiculoRepo();
    const clienteRepo = makeClienteRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new CreateVeiculoUseCase(veiculoRepo, clienteRepo);

    await expect(useCase.execute(validDto)).rejects.toThrow(NotFoundError);
    expect(veiculoRepo.save).not.toHaveBeenCalled();
  });

  it('throws ConflictError when placa is already registered', async () => {
    const existingVeiculo = { id: 'existing' } as any;
    const veiculoRepo = makeVeiculoRepo({ findByPlaca: jest.fn().mockResolvedValue(existingVeiculo) });
    const clienteRepo = makeClienteRepo();
    const useCase = new CreateVeiculoUseCase(veiculoRepo, clienteRepo);

    await expect(useCase.execute(validDto)).rejects.toThrow(ConflictError);
    expect(veiculoRepo.save).not.toHaveBeenCalled();
  });

  it('propagates ValidationError from domain entity (e.g. invalid placa)', async () => {
    const veiculoRepo = makeVeiculoRepo();
    const clienteRepo = makeClienteRepo();
    const useCase = new CreateVeiculoUseCase(veiculoRepo, clienteRepo);

    await expect(useCase.execute({ ...validDto, placa: 'INVALID' })).rejects.toThrow(ValidationError);
  });

  it('defaults quilometragem to 0 when not provided', async () => {
    const veiculoRepo = makeVeiculoRepo();
    const clienteRepo = makeClienteRepo();
    const useCase = new CreateVeiculoUseCase(veiculoRepo, clienteRepo);

    const result = await useCase.execute({ ...validDto, quilometragem: undefined });

    expect(result.quilometragem).toBe(0);
  });
});
