import { GetOrdensByCpfCnpjUseCase } from '@application/use-cases/ordem-servico/get-ordens-by-cpfcnpj.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { Cliente } from '@domain/entities/cliente.entity';
import { NotFoundError } from '@shared/errors/domain.error';

function makeCliente(): Cliente {
  return Cliente.create({
    id: 'cliente-uuid-1',
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

function makeOS(): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-uuid-1',
    veiculoId: 'veiculo-uuid-1',
    quilometragemEntrada: 50000,
  });
}

function makeOsRepo(ordens: OrdemServico[]): IOrdemServicoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByNumeroOS: jest.fn(),
    findByClienteId: jest.fn().mockResolvedValue({ ordens, total: ordens.length }),
    list: jest.fn(),
    update: jest.fn(),
    nextSequence: jest.fn(),
  };
}

function makeClienteRepo(cliente: Cliente | null): IClienteRepository {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByCpfCnpj: jest.fn().mockResolvedValue(cliente),
    findByEmail: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe('GetOrdensByCpfCnpjUseCase', () => {
  it('returns paginated OS list for a valid CPF/CNPJ', async () => {
    const os = makeOS();
    const useCase = new GetOrdensByCpfCnpjUseCase(makeOsRepo([os]), makeClienteRepo(makeCliente()));

    const result = await useCase.execute('52998224725');

    expect(result.ordens).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.ordens[0]!.clienteId).toBe('cliente-uuid-1');
  });

  it('returns empty list when cliente has no OS', async () => {
    const useCase = new GetOrdensByCpfCnpjUseCase(makeOsRepo([]), makeClienteRepo(makeCliente()));

    const result = await useCase.execute('52998224725');

    expect(result.ordens).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('throws NotFoundError when cliente not found', async () => {
    const useCase = new GetOrdensByCpfCnpjUseCase(makeOsRepo([]), makeClienteRepo(null));

    await expect(useCase.execute('00000000000')).rejects.toThrow(NotFoundError);
  });

  it('passes page and limit to repository', async () => {
    const osRepo = makeOsRepo([]);
    const useCase = new GetOrdensByCpfCnpjUseCase(osRepo, makeClienteRepo(makeCliente()));

    await useCase.execute('52998224725', 2, 5);

    expect(osRepo.findByClienteId).toHaveBeenCalledWith('cliente-uuid-1', 2, 5);
  });

  it('uses default page=1 limit=20 when not provided', async () => {
    const osRepo = makeOsRepo([]);
    const useCase = new GetOrdensByCpfCnpjUseCase(osRepo, makeClienteRepo(makeCliente()));

    await useCase.execute('52998224725');

    expect(osRepo.findByClienteId).toHaveBeenCalledWith('cliente-uuid-1', 1, 20);
  });
});
