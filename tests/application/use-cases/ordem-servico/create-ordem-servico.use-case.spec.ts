import { CreateOrdemServicoUseCase } from '@application/use-cases/ordem-servico/create-ordem-servico.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { Cliente } from '@domain/entities/cliente.entity';
import { Veiculo } from '@domain/entities/veiculo.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';

const CLIENT_ID = 'cliente-uuid-1';
const VEICULO_ID = 'veiculo-uuid-1';

function makeCliente(): Cliente {
  return Cliente.create({
    id: CLIENT_ID,
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

function makeVeiculo(clienteId = CLIENT_ID): Veiculo {
  return Veiculo.create({
    id: VEICULO_ID,
    clienteId,
    placa: 'ABC1D23',
    marca: 'Honda',
    modelo: 'Civic',
    ano: 2020,
    quilometragem: 50000,
  });
}

function makeOsRepo(overrides: Partial<IOrdemServicoRepository> = {}): IOrdemServicoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByNumeroOS: jest.fn().mockResolvedValue(null),
    findByClienteId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    nextSequence: jest.fn().mockResolvedValue(1),
    ...overrides,
  };
}

function makeClienteRepo(overrides: Partial<IClienteRepository> = {}): IClienteRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByCpfCnpj: jest.fn().mockResolvedValue(makeCliente()),
    findByEmail: jest.fn().mockResolvedValue(null),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

function makeVeiculoRepo(overrides: Partial<IVeiculoRepository> = {}): IVeiculoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findByPlaca: jest.fn().mockResolvedValue(makeVeiculo()),
    findByClienteId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

const validDto = {
  cpfCnpj: '52998224725',
  placa: 'ABC1D23',
  quilometragemEntrada: 50000,
};

describe('CreateOrdemServicoUseCase', () => {
  it('creates OS with valid data and returns DTO', async () => {
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), makeClienteRepo(), makeVeiculoRepo());
    const result = await useCase.execute(validDto);

    expect(result.id).toBeDefined();
    expect(result.clienteId).toBe(CLIENT_ID);
    expect(result.veiculoId).toBe(VEICULO_ID);
    expect(result.status).toBe('ABERTA');
    expect(result.temPagamento).toBe(false);
    expect(result.servicos).toHaveLength(0);
    expect(result.valorTotal).toBe(0);
  });

  it('generates numeroOS in OS-YYYYMMDD-#### format', async () => {
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), makeClienteRepo(), makeVeiculoRepo());
    const result = await useCase.execute(validDto);

    expect(result.numeroOS).toMatch(/^OS-\d{8}-\d{4}$/);
  });

  it('saves the OS and calls nextSequence once', async () => {
    const osRepo = makeOsRepo();
    const useCase = new CreateOrdemServicoUseCase(osRepo, makeClienteRepo(), makeVeiculoRepo());
    await useCase.execute(validDto);

    expect(osRepo.save).toHaveBeenCalledTimes(1);
    expect(osRepo.nextSequence).toHaveBeenCalledTimes(1);
  });

  it('calls nextSequence with today YYYYMMDD dateKey', async () => {
    const osRepo = makeOsRepo();
    const useCase = new CreateOrdemServicoUseCase(osRepo, makeClienteRepo(), makeVeiculoRepo());
    await useCase.execute(validDto);

    const dateKeyArg = (osRepo.nextSequence as jest.Mock).mock.calls[0][0] as string;
    expect(dateKeyArg).toMatch(/^\d{8}$/);
  });

  it('throws NotFoundError when cliente not found', async () => {
    const clienteRepo = makeClienteRepo({ findByCpfCnpj: jest.fn().mockResolvedValue(null) });
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), clienteRepo, makeVeiculoRepo());

    await expect(useCase.execute(validDto)).rejects.toThrow(NotFoundError);
  });

  it('does not call nextSequence or save when cliente not found', async () => {
    const osRepo = makeOsRepo();
    const clienteRepo = makeClienteRepo({ findByCpfCnpj: jest.fn().mockResolvedValue(null) });
    const useCase = new CreateOrdemServicoUseCase(osRepo, clienteRepo, makeVeiculoRepo());

    await expect(useCase.execute(validDto)).rejects.toThrow(NotFoundError);
    expect(osRepo.nextSequence).not.toHaveBeenCalled();
    expect(osRepo.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when veiculo not found', async () => {
    const veiculoRepo = makeVeiculoRepo({ findByPlaca: jest.fn().mockResolvedValue(null) });
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), makeClienteRepo(), veiculoRepo);

    await expect(useCase.execute(validDto)).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when veiculo does not belong to cliente', async () => {
    const veiculoRepo = makeVeiculoRepo({
      findByPlaca: jest.fn().mockResolvedValue(makeVeiculo('outro-cliente-id')),
    });
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), makeClienteRepo(), veiculoRepo);

    await expect(useCase.execute(validDto)).rejects.toThrow(ValidationError);
  });

  it('creates OS with initial servicos', async () => {
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), makeClienteRepo(), makeVeiculoRepo());
    const result = await useCase.execute({
      ...validDto,
      servicos: [
        { descricao: 'Troca de óleo', tempoEstimadoMinutos: 60, valorMaoDeObra: 150 },
        { descricao: 'Alinhamento e balanceamento', tempoEstimadoMinutos: 45, valorMaoDeObra: 80 },
      ],
    });

    expect(result.servicos).toHaveLength(2);
    expect(result.servicos[0]!.descricao).toBe('Troca de óleo');
    expect(result.servicos[0]!.status).toBe('PENDENTE');
    expect(result.servicos[1]!.descricao).toBe('Alinhamento e balanceamento');
  });

  it('calculates valorTotal from servicos', async () => {
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), makeClienteRepo(), makeVeiculoRepo());
    const result = await useCase.execute({
      ...validDto,
      servicos: [
        { descricao: 'Troca de óleo', tempoEstimadoMinutos: 60, valorMaoDeObra: 200 },
        { descricao: 'Revisão geral', tempoEstimadoMinutos: 90, valorMaoDeObra: 350 },
      ],
    });

    expect(result.valorTotal).toBe(550);
  });

  it('accepts optional observacoes', async () => {
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), makeClienteRepo(), makeVeiculoRepo());
    const result = await useCase.execute({ ...validDto, observacoes: 'Cliente relatou barulho no motor' });

    expect(result.observacoes).toBe('Cliente relatou barulho no motor');
  });

  it('dataAbertura is an ISO string', async () => {
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), makeClienteRepo(), makeVeiculoRepo());
    const result = await useCase.execute(validDto);

    expect(() => new Date(result.dataAbertura)).not.toThrow();
    expect(new Date(result.dataAbertura).getTime()).not.toBeNaN();
  });
});
