import { OutboxRelay } from '@application/messaging/outbox-relay';
import { PeriodicTask } from '@application/messaging/periodic-task';
import { OutboxEntry } from '@domain/repositories/outbox.repository';
import { InMemoryMessageBus } from '@infrastructure/messaging/in-memory-message-bus';
import { createEnvelope } from '@shared/messaging/envelope';
import { FakeOutbox, FakeUow } from '../saga/saga-harness';

const entry = (id: string, kind: 'queue' | 'topic', tentativas = 0): OutboxEntry => ({
  id, kind, destination: kind === 'queue' ? 'q' : 't', tentativas,
  envelope: createEnvelope({ type: 'X', sagaId: 's', correlationId: 'c', payload: {} }),
});

const setup = (entries: OutboxEntry[]) => {
  const outbox = new FakeOutbox();
  const published: string[] = [];
  const failed: { id: string; error: string; retryAt: Date }[] = [];
  outbox.claimBatch = async () => entries;
  outbox.markPublished = async (id) => { published.push(id); };
  outbox.markFailed = async (id, error, retryAt) => { failed.push({ id, error, retryAt }); };
  const bus = new InMemoryMessageBus();
  const now = new Date('2026-01-01T00:00:00Z');
  const relay = new OutboxRelay(new FakeUow([]), outbox, bus, { maxBackoffMs: 5000 }, () => now);
  return { relay, bus, published, failed, now };
};

describe('OutboxRelay', () => {
  it('publica fila via send e tópico via publish, marcando como enviadas', async () => {
    const { relay, bus, published } = setup([entry('1', 'queue'), entry('2', 'topic')]);
    expect(await relay.tick()).toBe(2);
    expect(bus.sent.map((s) => s.kind)).toEqual(['send', 'publish']);
    expect(published).toEqual(['1', '2']);
  });

  it('falha ao publicar agenda retry com backoff exponencial e segue o lote', async () => {
    const { relay, bus, published, failed, now } = setup([entry('1', 'queue', 2), entry('2', 'topic')]);
    const original = bus.send.bind(bus);
    bus.send = async () => { throw new Error('sqs fora'); };
    expect(await relay.tick()).toBe(1);
    expect(published).toEqual(['2']);
    expect(failed[0]).toMatchObject({ id: '1', error: 'sqs fora' });
    expect(failed[0].retryAt.getTime() - now.getTime()).toBe(4000);
    bus.send = original;
  });

  it('backoff respeita o teto', async () => {
    const { relay, bus, failed, now } = setup([entry('1', 'queue', 20)]);
    bus.send = async () => { throw 'texto'; };
    await relay.tick();
    expect(failed[0].error).toBe('texto');
    expect(failed[0].retryAt.getTime() - now.getTime()).toBe(5000);
  });

  it('lote vazio não faz nada', async () => {
    const { relay } = setup([]);
    expect(await relay.tick()).toBe(0);
  });

  it('start/stop do loop periódico', async () => {
    const { relay } = setup([]);
    relay.start();
    await relay.stop();
  });
});

describe('PeriodicTask', () => {
  it('executa repetidamente, sobrevive a erro e para no stop', async () => {
    let n = 0;
    const task = new PeriodicTask('t', 1, async () => {
      n++;
      if (n === 1) throw new Error('boom');
    });
    task.start();
    task.start(); // idempotente
    for (let i = 0; i < 100 && n < 3; i++) await new Promise((r) => setTimeout(r, 5));
    await task.stop();
    const parou = n;
    await new Promise((r) => setTimeout(r, 20));
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBe(parou);
  });
});
