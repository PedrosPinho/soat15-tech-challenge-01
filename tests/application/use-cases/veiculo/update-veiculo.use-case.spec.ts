import { UpdateVeiculoUseCase } from '@application/use-cases/veiculo/update-veiculo.use-case';
import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { Veiculo } from '@domain/entities/veiculo.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';

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

describe('UpdateVeiculoUseCase', () => {
  it('updates quilometragem with a higher value', async () => {
    const veiculo = makeVeiculo();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(veiculo) });
    const useCase = new UpdateVeiculoUseCase(repo);

    const result = await useCase.execute(veiculo.id, { quilometragem: 60000 });

    expect(result.quilometragem).toBe(60000);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('throws ValidationError when new quilometragem is less than current', async () => {
    const veiculo = makeVeiculo();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(veiculo) });
    const useCase = new UpdateVeiculoUseCase(repo);

    await expect(useCase.execute(veiculo.id, { quilometragem: 40000 })).rejects.toThrow(
      ValidationError,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError when new quilometragem equals current', async () => {
    const veiculo = makeVeiculo();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(veiculo) });
    const useCase = new UpdateVeiculoUseCase(repo);

    await expect(useCase.execute(veiculo.id, { quilometragem: 50000 })).rejects.toThrow(
      ValidationError,
    );
  });

  it('throws NotFoundError when veiculo does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const useCase = new UpdateVeiculoUseCase(repo);

    await expect(useCase.execute('non-existent', { quilometragem: 60000 })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('also updates optional fields cor and observacoes', async () => {
    const veiculo = makeVeiculo();
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(veiculo) });
    const useCase = new UpdateVeiculoUseCase(repo);

    const result = await useCase.execute(veiculo.id, {
      quilometragem: 60000,
      cor: 'Prata',
      observacoes: 'Revisão feita',
    });

    expect(result.quilometragem).toBe(60000);
    expect(result.cor).toBe('Prata');
    expect(result.observacoes).toBe('Revisão feita');
  });
});
