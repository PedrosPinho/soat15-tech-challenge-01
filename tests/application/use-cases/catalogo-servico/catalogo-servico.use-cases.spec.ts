import { CreateCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/create-catalogo-servico.use-case';
import { GetCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/get-catalogo-servico.use-case';
import { UpdateCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/update-catalogo-servico.use-case';
import { ListCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/list-catalogo-servico.use-case';
import { DeleteCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/delete-catalogo-servico.use-case';
import { ICatalogoServicoRepository } from '@domain/repositories/catalogo-servico.repository';
import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';
import { NotFoundError } from '@shared/errors/domain.error';

function makeEntity(overrides: Partial<{ preco: number; tempoEstimado: number }> = {}): CatalogoServico {
  return CatalogoServico.create({
    id: 'cs-uuid-1',
    descricao: 'Troca de óleo',
    preco: 80,
    tempoEstimado: 30,
    ...overrides,
  });
}

function makeRepo(entity: CatalogoServico | null = null): ICatalogoServicoRepository {
  return {
    save: jest.fn(),
    findById: jest.fn().mockResolvedValue(entity),
    list: jest.fn().mockResolvedValue({ servicos: [], total: 0 }),
    update: jest.fn(),
  };
}

describe('CreateCatalogoServicoUseCase', () => {
  it('cria e salva o serviço, retorna DTO', async () => {
    const repo = makeRepo();
    const result = await new CreateCatalogoServicoUseCase(repo).execute({
      descricao: 'Alinhamento', preco: 120, tempoEstimado: 60,
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(result.descricao).toBe('Alinhamento');
    expect(result.preco).toBe(120);
    expect(result.tempoEstimado).toBe(60);
    expect(result.ativo).toBe(true);
    expect(result.id).toBeDefined();
  });
});

describe('GetCatalogoServicoUseCase', () => {
  it('retorna DTO quando encontrado', async () => {
    const entity = makeEntity();
    const result = await new GetCatalogoServicoUseCase(makeRepo(entity)).execute('cs-uuid-1');
    expect(result.id).toBe('cs-uuid-1');
    expect(result.descricao).toBe('Troca de óleo');
  });

  it('lança NotFoundError quando não encontrado', async () => {
    await expect(new GetCatalogoServicoUseCase(makeRepo(null)).execute('x')).rejects.toThrow(NotFoundError);
  });
});

describe('UpdateCatalogoServicoUseCase', () => {
  it('edita e atualiza o serviço', async () => {
    const entity = makeEntity();
    const repo = makeRepo(entity);
    const result = await new UpdateCatalogoServicoUseCase(repo).execute('cs-uuid-1', {
      descricao: 'Troca de filtro', preco: 50,
    });

    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(result.descricao).toBe('Troca de filtro');
    expect(result.preco).toBe(50);
    expect(result.tempoEstimado).toBe(30);
  });

  it('lança NotFoundError quando não encontrado', async () => {
    await expect(
      new UpdateCatalogoServicoUseCase(makeRepo(null)).execute('x', { preco: 10 }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('ListCatalogoServicoUseCase', () => {
  it('retorna lista vazia com paginação padrão', async () => {
    const repo = makeRepo();
    const result = await new ListCatalogoServicoUseCase(repo).execute({});

    expect(result.servicos).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(repo.list).toHaveBeenCalledWith(1, 20, { ativo: true, search: undefined });
  });

  it('usa paginação e search informados', async () => {
    const repo = makeRepo();
    (repo.list as jest.Mock).mockResolvedValue({ servicos: [makeEntity()], total: 1 });
    const result = await new ListCatalogoServicoUseCase(repo).execute({ page: 2, limit: 5, search: 'oleo' });

    expect(result.servicos).toHaveLength(1);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(repo.list).toHaveBeenCalledWith(2, 5, { ativo: true, search: 'oleo' });
  });
});

describe('DeleteCatalogoServicoUseCase', () => {
  it('marca o serviço como inativo', async () => {
    const entity = makeEntity();
    const repo = makeRepo(entity);
    await new DeleteCatalogoServicoUseCase(repo).execute('cs-uuid-1');

    expect(repo.update).toHaveBeenCalledTimes(1);
    const updated = (repo.update as jest.Mock).mock.calls[0][0] as CatalogoServico;
    expect(updated.ativo).toBe(false);
  });

  it('lança NotFoundError quando não encontrado', async () => {
    await expect(new DeleteCatalogoServicoUseCase(makeRepo(null)).execute('x')).rejects.toThrow(NotFoundError);
  });
});
