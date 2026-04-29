import { AprovarOSUseCase } from '@application/use-cases/ordem-servico/aprovar-os.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';

function makeOS(status: StatusOS = 'AGUARDANDO_APROVACAO'): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
    status,
  });
}

function makeRepo(os: OrdemServico | null, overrides: Partial<IOrdemServicoRepository> = {}): IOrdemServicoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(os),
    findByNumeroOS: jest.fn(),
    findByClienteId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    nextSequence: jest.fn(),
    ...overrides,
  };
}

describe('AprovarOSUseCase', () => {
  it('transitions OS from AGUARDANDO_APROVACAO to EM_EXECUCAO', async () => {
    const repo = makeRepo(makeOS('AGUARDANDO_APROVACAO'));
    const useCase = new AprovarOSUseCase(repo);

    const result = await useCase.execute('os-uuid-1');

    expect(result.status).toBe('EM_EXECUCAO');
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when OS not found', async () => {
    const repo = makeRepo(null);
    const useCase = new AprovarOSUseCase(repo);

    await expect(useCase.execute('nao-existe')).rejects.toThrow(NotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError when OS is not AGUARDANDO_APROVACAO', async () => {
    const repo = makeRepo(makeOS('EM_DIAGNOSTICO'));
    const useCase = new AprovarOSUseCase(repo);

    await expect(useCase.execute('os-uuid-1')).rejects.toThrow(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
