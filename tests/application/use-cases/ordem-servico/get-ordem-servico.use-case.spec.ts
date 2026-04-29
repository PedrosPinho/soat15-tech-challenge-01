import { GetOrdemServicoUseCase } from '@application/use-cases/ordem-servico/get-ordem-servico.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { NotFoundError } from '@shared/errors/domain.error';

function makeOS(): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
  });
}

function makeRepo(os: OrdemServico | null): IOrdemServicoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(os),
    findByNumeroOS: jest.fn(),
    findByClienteId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    nextSequence: jest.fn(),
  };
}

describe('GetOrdemServicoUseCase', () => {
  it('returns DTO when OS exists', async () => {
    const useCase = new GetOrdemServicoUseCase(makeRepo(makeOS()));
    const result = await useCase.execute('os-uuid-1');

    expect(result.id).toBe('os-uuid-1');
    expect(result.numeroOS).toBe('OS-20260428-0001');
    expect(result.status).toBe('RECEBIDA');
  });

  it('throws NotFoundError when OS not found', async () => {
    const useCase = new GetOrdemServicoUseCase(makeRepo(null));
    await expect(useCase.execute('nao-existe')).rejects.toThrow(NotFoundError);
  });
});
