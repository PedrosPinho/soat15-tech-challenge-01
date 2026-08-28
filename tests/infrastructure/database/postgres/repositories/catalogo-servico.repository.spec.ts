import { Pool } from 'pg';
import { PostgresCatalogoServicoRepository } from '@infrastructure/database/postgres/repositories/catalogo-servico.repository.impl';
import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../../../../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

let pool: Pool;
let repo: PostgresCatalogoServicoRepository;

beforeAll(async () => {
  pool = await startTestDatabase();
  repo = new PostgresCatalogoServicoRepository(pool);
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

function makeServico(overrides: Partial<{ descricao: string }> = {}): CatalogoServico {
  return CatalogoServico.create({
    descricao: overrides.descricao ?? 'Troca de óleo',
    preco: 150,
    tempoEstimado: 60,
  });
}

describe('PostgresCatalogoServicoRepository (integration com PostgreSQL real via Testcontainers)', () => {
  it('save + findById — persiste e recupera', async () => {
    const servico = makeServico();
    await repo.save(servico);

    const found = await repo.findById(servico.id);
    expect(found?.descricao).toBe('Troca de óleo');
    expect(found?.preco).toBe(150);
    expect(found?.tempoEstimado).toBe(60);
    expect(found?.ativo).toBe(true);
  });

  it('findById — retorna null quando não encontrado', async () => {
    expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('list — filtra por ativo', async () => {
    const servico = makeServico();
    await repo.save(servico);
    await repo.update(servico.deletar());

    const ativos = await repo.list(1, 10, { ativo: true });
    const inativos = await repo.list(1, 10, { ativo: false });
    expect(ativos.total).toBe(0);
    expect(inativos.total).toBe(1);
  });

  it('list — busca textual via índice GIN', async () => {
    await repo.save(makeServico({ descricao: 'Alinhamento e balanceamento' }));
    await repo.save(makeServico({ descricao: 'Troca de óleo' }));

    const result = await repo.list(1, 10, { search: 'balanceamento' });
    expect(result.total).toBe(1);
    expect(result.servicos[0].descricao).toContain('balanceamento');
  });

  it('update — persiste edição de preço e descrição', async () => {
    const servico = makeServico();
    await repo.save(servico);

    const editado = servico.editar({ preco: 200, descricao: 'Troca de óleo sintético' });
    await repo.update(editado);

    const found = await repo.findById(servico.id);
    expect(found?.preco).toBe(200);
    expect(found?.descricao).toBe('Troca de óleo sintético');
  });
});
