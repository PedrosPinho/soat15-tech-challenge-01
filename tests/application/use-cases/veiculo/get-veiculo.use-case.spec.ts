import { GetVeiculoUseCase } from '@application/use-cases/veiculo/get-veiculo.use-case';
import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { Veiculo } from '@domain/entities/veiculo.entity';
import { NotFoundError } from '@shared/errors/domain.error';

function makeVeiculo(): Veiculo {
  return Veiculo.create({
    clienteId: 'client-uuid',
    placa: 'ABC1D23',
    marca: 'Honda',
    modelo: 'Civic',
    ano: 2020,
    quilometragem: 50000,
  });
}

function makeRepo(overrides: Partial<IVeiculoRepository> = {}): IVeiculoRepository {
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

describe('GetVeiculoUseCase', () => {
  it('returns veiculo when found', async () => {
    const veiculo = makeVeiculo();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(veiculo) });
    const useCase = new GetVeiculoUseCase(repo);

    const result = await useCase.execute(veiculo.id);

    expect(result.id).toBe(veiculo.id);
    expect(result.placa).toBe('ABC1D23');
  });

  it('throws NotFoundError when veiculo does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new GetVeiculoUseCase(repo);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(NotFoundError);
  });
});
