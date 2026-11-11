import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { OutboxRelay } from '@application/messaging/outbox-relay';
import { PostgresInboxRepository } from '@infrastructure/database/postgres/repositories/inbox.repository.impl';
import { PostgresOutboxRepository } from '@infrastructure/database/postgres/repositories/outbox.repository.impl';
import { PostgresUnitOfWork } from '@infrastructure/database/postgres/unit-of-work';
import { setPool } from '@infrastructure/database/postgres/pool';
import { InMemoryMessageBus } from '@infrastructure/messaging/in-memory-message-bus';
import { createEnvelope } from '@shared/messaging/envelope';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../../../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

let pool: Pool;
const uow = new PostgresUnitOfWork();

beforeAll(async () => {
  pool = await startTestDatabase();
  setPool(pool);
});
afterEach(async () => clearTestDatabase());
afterAll(async () => stopTestDatabase());

const entry = (n = 1) => ({
  kind: 'queue' as const,
  destination: 'billing-commands',
  envelope: createEnvelope({ type: 'GerarOrcamento', sagaId: 's', correlationId: `c${n}`, payload: { n } }),
});

const countOutbox = async (where = ''): Promise<number> =>
  (await pool.query(`SELECT count(*)::int AS n FROM outbox ${where}`)).rows[0].n;

describe('Transactional outbox (PostgreSQL real)', () => {
  it('rollback da transação de negócio ⇒ nada fica no outbox', async () => {
    const outbox = new PostgresOutboxRepository();
    await expect(
      uow.run(async () => {
        await outbox.enqueue(entry());
        throw new Error('falha de negócio depois do enqueue');
      }),
    ).rejects.toThrow('falha de negócio');
    expect(await countOutbox()).toBe(0);
  });

  it('commit grava a mensagem', async () => {
    await uow.run(() => new PostgresOutboxRepository().enqueue(entry()));
    expect(await countOutbox()).toBe(1);
  });

  it('2 relays concorrentes não publicam a mesma linha duas vezes (SKIP LOCKED)', async () => {
    const outbox = new PostgresOutboxRepository();
    for (let i = 0; i < 10; i++) await uow.run(() => outbox.enqueue(entry(i)));

    const bus = new InMemoryMessageBus();
    const lento = {
      send: async (q: string, m: Parameters<InMemoryMessageBus['send']>[1]) => {
        await new Promise((r) => setTimeout(r, 50)); // segura o lock para forçar a sobreposição
        return bus.send(q, m);
      },
      publish: bus.publish.bind(bus),
      subscribe: bus.subscribe.bind(bus),
    };
    const relayA = new OutboxRelay(uow, outbox, lento, { batchSize: 10 });
    const relayB = new OutboxRelay(uow, outbox, lento, { batchSize: 10 });

    await Promise.all([relayA.tick(), relayB.tick()]);

    const ids = bus.sent.map((s) => s.message.messageId);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    expect(await countOutbox('WHERE publicado_em IS NULL')).toBe(0);
  });

  it('falha ao publicar mantém a linha pendente com backoff', async () => {
    const outbox = new PostgresOutboxRepository();
    await uow.run(() => outbox.enqueue(entry()));
    const quebrado = {
      send: async () => { throw new Error('sqs fora'); },
      publish: async () => undefined,
      subscribe: async () => ({ stop: async () => undefined }),
    };
    await new OutboxRelay(uow, outbox, quebrado).tick();
    const { rows } = await pool.query('SELECT tentativas, ultimo_erro, proxima_tentativa_em > now() AS futuro FROM outbox');
    expect(rows[0]).toMatchObject({ tentativas: 1, ultimo_erro: 'sqs fora', futuro: true });
  });
});

describe('Inbox (PostgreSQL real)', () => {
  it('a mesma mensagem entregue 2x é registrada 1x', async () => {
    const inbox = new PostgresInboxRepository();
    const id = randomUUID();
    expect(await inbox.markProcessed(id, 'X')).toBe(true);
    expect(await inbox.markProcessed(id, 'X')).toBe(false);
  });

  it('rollback desfaz o registro do inbox (a reentrega reprocessa)', async () => {
    const inbox = new PostgresInboxRepository();
    const id = randomUUID();
    await expect(
      uow.run(async () => {
        await inbox.markProcessed(id, 'X');
        throw new Error('handler falhou');
      }),
    ).rejects.toThrow();
    expect(await inbox.markProcessed(id, 'X')).toBe(true);
  });
});
