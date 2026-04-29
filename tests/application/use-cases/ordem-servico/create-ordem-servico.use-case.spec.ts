import { CreateOrdemServicoUseCase } from '@application/use-cases/ordem-servico/create-ordem-servico.use-case';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { ICatalogoServicoRepository } from '@domain/repositories/catalogo-servico.repository';
import { IPecaRepository } from '@domain/repositories/peca.repository';
import { Cliente } from '@domain/entities/cliente.entity';
import { Veiculo } from '@domain/entities/veiculo.entity';
import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';
import { Peca } from '@domain/entities/peca.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';

const CLIENT_ID = 'cliente-uuid-1';
const VEICULO_ID = 'veiculo-uuid-1';
const CATALOGO_ID = 'catalogo-uuid-1';
const PECA_ID = 'peca-uuid-1';

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

function makeCatalogo(): CatalogoServico {
  return CatalogoServico.create({
    id: CATALOGO_ID,
    descricao: 'Troca de óleo',
    preco: 150,
    tempoEstimado: 1,
  });
}

function makePeca(): Peca {
  return Peca.create({
    id: PECA_ID,
    codigo: 'OL-5W30',
    descricao: 'Óleo Motor 5W30 1L',
    categoria: 'FLUIDOS',
    unidadeMedida: 'LITRO',
    precoCompra: 20,
    precoVenda: 35,
    nivelMinimo: 5,
    nivelMaximo: 50,
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

function makeCatalogoRepo(overrides: Partial<ICatalogoServicoRepository> = {}): ICatalogoServicoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(makeCatalogo()),
    list: jest.fn(),
    update: jest.fn(),
    ...overrides,
  };
}

function makePecaRepo(overrides: Partial<IPecaRepository> = {}): IPecaRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(makePeca()),
    findByCodigo: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  };
}

function makeUseCase(overrides: {
  osRepo?: Partial<IOrdemServicoRepository>;
  clienteRepo?: Partial<IClienteRepository>;
  veiculoRepo?: Partial<IVeiculoRepository>;
  catalogoRepo?: Partial<ICatalogoServicoRepository>;
  pecaRepo?: Partial<IPecaRepository>;
} = {}) {
  return new CreateOrdemServicoUseCase(
    makeOsRepo(overrides.osRepo),
    makeClienteRepo(overrides.clienteRepo),
    makeVeiculoRepo(overrides.veiculoRepo),
    makeCatalogoRepo(overrides.catalogoRepo),
    makePecaRepo(overrides.pecaRepo),
  );
}

const validDto = {
  cpfCnpj: '52998224725',
  placa: 'ABC1D23',
  quilometragemEntrada: 50000,
};

describe('CreateOrdemServicoUseCase', () => {
  it('creates OS with no catalogoServicos and returns DTO', async () => {
    const result = await makeUseCase().execute(validDto);

    expect(result.id).toBeDefined();
    expect(result.cpfCnpj).toBe('52998224725');
    expect(result.placa).toBe('ABC1D23');
    expect(result.status).toBe('RECEBIDA');
    expect(result.temPagamento).toBe(false);
    expect(result.servicos).toHaveLength(0);
    expect(result.valorTotal).toBe(0);
  });

  it('generates numeroOS in OS-YYYYMMDD-#### format', async () => {
    const result = await makeUseCase().execute(validDto);
    expect(result.numeroOS).toMatch(/^OS-\d{8}-\d{4}$/);
  });

  it('saves the OS and calls nextSequence once', async () => {
    const osRepo = makeOsRepo();
    const useCase = new CreateOrdemServicoUseCase(osRepo, makeClienteRepo(), makeVeiculoRepo(), makeCatalogoRepo(), makePecaRepo());
    await useCase.execute(validDto);

    expect(osRepo.save).toHaveBeenCalledTimes(1);
    expect(osRepo.nextSequence).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when cliente not found', async () => {
    await expect(
      makeUseCase({ clienteRepo: { findByCpfCnpj: jest.fn().mockResolvedValue(null) } }).execute(validDto),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when veiculo not found', async () => {
    await expect(
      makeUseCase({ veiculoRepo: { findByPlaca: jest.fn().mockResolvedValue(null) } }).execute(validDto),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when veiculo does not belong to cliente', async () => {
    await expect(
      makeUseCase({ veiculoRepo: { findByPlaca: jest.fn().mockResolvedValue(makeVeiculo('outro-cliente-id')) } }).execute(validDto),
    ).rejects.toThrow(ValidationError);
  });

  it('creates OS with catalogoServicos and resolves service data from catalog', async () => {
    const result = await makeUseCase().execute({
      ...validDto,
      catalogoServicos: [{ catalogoServicoId: CATALOGO_ID }],
    });

    expect(result.servicos).toHaveLength(1);
    expect(result.servicos[0]!.descricao).toBe('Troca de óleo');
    expect(result.servicos[0]!.valorMaoDeObra).toBe(150);
    expect(result.servicos[0]!.tempoEstimadoMinutos).toBe(60);
  });

  it('calculates valorTotal from catalog price', async () => {
    const result = await makeUseCase().execute({
      ...validDto,
      catalogoServicos: [{ catalogoServicoId: CATALOGO_ID }],
    });

    expect(result.valorTotal).toBe(150);
  });

  it('resolves peca price from database and embeds in servico', async () => {
    const result = await makeUseCase().execute({
      ...validDto,
      catalogoServicos: [{
        catalogoServicoId: CATALOGO_ID,
        pecasUtilizadas: [{ pecaId: PECA_ID, quantidade: 2 }],
      }],
    });

    expect(result.servicos[0]!.pecasUtilizadas).toHaveLength(1);
    expect(result.servicos[0]!.pecasUtilizadas[0]!.precoUnitario).toBe(35);
    expect(result.servicos[0]!.pecasUtilizadas[0]!.quantidade).toBe(2);
    expect(result.valorTotal).toBe(150 + 35 * 2);
  });

  it('throws NotFoundError when catalogoServico not found', async () => {
    await expect(
      makeUseCase({ catalogoRepo: { findById: jest.fn().mockResolvedValue(null) } }).execute({
        ...validDto,
        catalogoServicos: [{ catalogoServicoId: 'nao-existe' }],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when peca not found', async () => {
    await expect(
      makeUseCase({ pecaRepo: { findById: jest.fn().mockResolvedValue(null) } }).execute({
        ...validDto,
        catalogoServicos: [{
          catalogoServicoId: CATALOGO_ID,
          pecasUtilizadas: [{ pecaId: 'nao-existe', quantidade: 1 }],
        }],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('accepts optional observacoes', async () => {
    const result = await makeUseCase().execute({ ...validDto, observacoes: 'Cliente relatou barulho no motor' });
    expect(result.observacoes).toBe('Cliente relatou barulho no motor');
  });

  it('dataAbertura is an ISO string', async () => {
    const result = await makeUseCase().execute(validDto);
    expect(() => new Date(result.dataAbertura)).not.toThrow();
    expect(new Date(result.dataAbertura).getTime()).not.toBeNaN();
  });

  it('converts tempoEstimado (hours) to tempoEstimadoMinutos', async () => {
    const catalogoRepo = makeCatalogoRepo({
      findById: jest.fn().mockResolvedValue(CatalogoServico.create({
        id: CATALOGO_ID, descricao: 'Revisão', preco: 200, tempoEstimado: 1.5,
      })),
    });
    const useCase = new CreateOrdemServicoUseCase(makeOsRepo(), makeClienteRepo(), makeVeiculoRepo(), catalogoRepo, makePecaRepo());
    const result = await useCase.execute({
      ...validDto,
      catalogoServicos: [{ catalogoServicoId: CATALOGO_ID }],
    });

    expect(result.servicos[0]!.tempoEstimadoMinutos).toBe(90);
  });
});
