import { MongoOrdemServicoRepository } from '@infrastructure/database/mongodb/repositories/ordem-servico.repository.impl';
import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../setup/mongo-memory.helper';

jest.setTimeout(30000);

beforeAll(async () => {
  await connectTestDatabase();
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

let seq = 0;
function makeOS(status: StatusOS, dataAbertura: Date, clienteId = 'cliente-1'): OrdemServico {
  seq += 1;
  return OrdemServico.create({
    numeroOS: `OS-INTEGRATION-${seq}`,
    clienteId,
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 1000,
    status,
    dataAbertura,
  });
}

describe('MongoOrdemServicoRepository (integration com Mongo real)', () => {
  it('persiste e recupera uma OS com serviços embarcados', async () => {
    const repo = new MongoOrdemServicoRepository();
    const os = makeOS('RECEBIDA', new Date());

    await repo.save(os);
    const found = await repo.findById(os.id);

    expect(found).not.toBeNull();
    expect(found?.numeroOS).toBe(os.numeroOS);
    expect(found?.status).toBe('RECEBIDA');
  });

  it('update() persiste a transição de status', async () => {
    const repo = new MongoOrdemServicoRepository();
    const os = makeOS('RECEBIDA', new Date());
    await repo.save(os);

    const iniciada = os.iniciar();
    await repo.update(iniciada);

    const found = await repo.findById(os.id);
    expect(found?.status).toBe('EM_DIAGNOSTICO');
    expect(found?.dataInicio).toBeDefined();
  });

  it('nextSequence() incrementa atomicamente para a mesma dateKey', async () => {
    const repo = new MongoOrdemServicoRepository();

    const results = await Promise.all([
      repo.nextSequence('20260707'),
      repo.nextSequence('20260707'),
      repo.nextSequence('20260707'),
    ]);

    expect(new Set(results)).toEqual(new Set([1, 2, 3]));
  });

  it('list() ordena por peso de status desc e dataAbertura asc, excluindo FINALIZADA/ENTREGUE por padrão', async () => {
    const repo = new MongoOrdemServicoRepository();
    const base = new Date('2026-01-01T00:00:00Z');
    const day = (n: number) => new Date(base.getTime() + n * 86_400_000);

    await repo.save(makeOS('RECEBIDA', day(2)));
    await repo.save(makeOS('RECEBIDA', day(1)));
    await repo.save(makeOS('EM_DIAGNOSTICO', day(3)));
    await repo.save(makeOS('AGUARDANDO_APROVACAO', day(4)));
    await repo.save(makeOS('EM_EXECUCAO', day(5)));
    await repo.save(makeOS('FINALIZADA', day(6)));
    await repo.save(makeOS('ENTREGUE', day(7)));

    const { ordens, total } = await repo.list(1, 20, {});

    expect(total).toBe(5);
    expect(ordens.map((o) => o.status)).toEqual([
      'EM_EXECUCAO',
      'AGUARDANDO_APROVACAO',
      'EM_DIAGNOSTICO',
      'RECEBIDA',
      'RECEBIDA',
    ]);
    // desempate: RECEBIDA mais antiga (day(1)) antes da mais recente (day(2))
    const recebidas = ordens.filter((o) => o.status === 'RECEBIDA');
    expect(recebidas[0].dataAbertura.getTime()).toBeLessThan(recebidas[1].dataAbertura.getTime());
  });

  it('list() inclui FINALIZADA quando o filtro pede explicitamente', async () => {
    const repo = new MongoOrdemServicoRepository();
    await repo.save(makeOS('FINALIZADA', new Date()));
    await repo.save(makeOS('RECEBIDA', new Date()));

    const { ordens, total } = await repo.list(1, 20, { status: 'FINALIZADA' });

    expect(total).toBe(1);
    expect(ordens[0].status).toBe('FINALIZADA');
  });

  it('list() pagina corretamente respeitando skip/limit dentro do facet', async () => {
    const repo = new MongoOrdemServicoRepository();
    const base = new Date('2026-02-01T00:00:00Z');
    for (let i = 0; i < 3; i += 1) {
      await repo.save(makeOS('RECEBIDA', new Date(base.getTime() + i * 86_400_000)));
    }

    const page1 = await repo.list(1, 2, {});
    const page2 = await repo.list(2, 2, {});

    expect(page1.ordens).toHaveLength(2);
    expect(page2.ordens).toHaveLength(1);
    expect(page1.total).toBe(3);
    expect(page2.total).toBe(3);
  });
});
