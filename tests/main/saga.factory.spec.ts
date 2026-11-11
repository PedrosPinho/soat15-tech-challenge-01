import { InMemoryMessageBus } from '@infrastructure/messaging/in-memory-message-bus';
import { SqsSnsMessageBus } from '@infrastructure/messaging/sqs-sns-message-bus';
import { getSagaRuntime, makeMessageBus, makeOutboxRelay } from '@main/factories/saga.factory';
import { OutboxRelay } from '@application/messaging/outbox-relay';
import { SagaOrchestrator } from '@application/saga/saga-orchestrator';

jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: jest.fn() }) }));

const ENV = ['MESSAGING_DRIVER', 'EXECUTION_COMMANDS_QUEUE_URL', 'BILLING_COMMANDS_QUEUE_URL',
  'SAGA_REPLIES_QUEUE_URL', 'EVENTS_TOPIC_ARN'];
afterEach(() => ENV.forEach((k) => delete process.env[k]));

describe('saga.factory', () => {
  it('MESSAGING_DRIVER=memory usa o bus em memória com o tópico ligado à fila de respostas', async () => {
    process.env.MESSAGING_DRIVER = 'memory';
    const bus = makeMessageBus();
    expect(bus).toBeInstanceOf(InMemoryMessageBus);
    const recebidas: string[] = [];
    await bus.subscribe('os-saga-replies', async (m) => { recebidas.push(m.type); });
    await bus.publish('oficina-eventos', {
      messageId: 'm', type: 'X', version: 1, sagaId: 's', correlationId: 'c',
      occurredAt: new Date().toISOString(), payload: {},
    });
    expect(recebidas).toEqual(['X']);
  });

  it('driver sqs exige as URLs/ARN configurados', () => {
    expect(() => makeMessageBus()).toThrow('EXECUTION_COMMANDS_QUEUE_URL');
  });

  it('driver sqs com tudo configurado devolve o adapter SQS/SNS', () => {
    process.env.EXECUTION_COMMANDS_QUEUE_URL = 'http://q/exec';
    process.env.BILLING_COMMANDS_QUEUE_URL = 'http://q/bill';
    process.env.SAGA_REPLIES_QUEUE_URL = 'http://q/replies';
    process.env.EVENTS_TOPIC_ARN = 'arn:aws:sns:us-east-1:000:eventos';
    expect(makeMessageBus()).toBeInstanceOf(SqsSnsMessageBus);
  });

  it('getSagaRuntime monta o orquestrador uma única vez (singleton)', () => {
    const a = getSagaRuntime();
    expect(a.orchestrator).toBeInstanceOf(SagaOrchestrator);
    expect(getSagaRuntime()).toBe(a);
  });

  it('makeOutboxRelay cria o relay sobre o outbox Postgres', () => {
    expect(makeOutboxRelay(new InMemoryMessageBus())).toBeInstanceOf(OutboxRelay);
  });
});
