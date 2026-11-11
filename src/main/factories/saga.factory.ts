import { SQSClient } from '@aws-sdk/client-sqs';
import { SNSClient } from '@aws-sdk/client-sns';
import { OutboxRelay } from '@application/messaging/outbox-relay';
import { sagaConfigFromEnv } from '@application/saga/saga-config';
import { SagaOrchestrator } from '@application/saga/saga-orchestrator';
import { notificarMudancaStatusOS } from '@application/use-cases/ordem-servico/notificar-mudanca-status.helper';
import { IMessageBus } from '@domain/services/message-bus';
import { InventoryService } from '@domain/services/inventory.service';
import { PostgresCatalogoServicoRepository } from '@infrastructure/database/postgres/repositories/catalogo-servico.repository.impl';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { PostgresInboxRepository } from '@infrastructure/database/postgres/repositories/inbox.repository.impl';
import { PostgresItemEstoqueRepository } from '@infrastructure/database/postgres/repositories/item-estoque.repository.impl';
import { PostgresOrdemServicoRepository } from '@infrastructure/database/postgres/repositories/ordem-servico.repository.impl';
import { PostgresOutboxRepository } from '@infrastructure/database/postgres/repositories/outbox.repository.impl';
import { PostgresPecaRepository } from '@infrastructure/database/postgres/repositories/peca.repository.impl';
import { PostgresSagaRepository } from '@infrastructure/database/postgres/repositories/saga.repository.impl';
import { PostgresStatusHistoricoRepository } from '@infrastructure/database/postgres/repositories/status-historico.repository.impl';
import { PostgresUnitOfWork } from '@infrastructure/database/postgres/unit-of-work';
import { InMemoryMessageBus } from '@infrastructure/messaging/in-memory-message-bus';
import { SqsSnsMessageBus } from '@infrastructure/messaging/sqs-sns-message-bus';
import { Destinations } from '@shared/messaging/messages';
import { makeNotificationService } from './notification.factory';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} é obrigatória (MESSAGING_DRIVER=sqs)`);
  return value;
};

/**
 * `MESSAGING_DRIVER=memory` (testes/dev sem AWS) ou `sqs` (default em
 * ambientes reais). `AWS_ENDPOINT_URL` aponta para o LocalStack localmente.
 */
export const makeMessageBus = (): IMessageBus => {
  if (process.env.MESSAGING_DRIVER === 'memory') {
    const bus = new InMemoryMessageBus();
    bus.bindTopic(Destinations.EventosTopic, Destinations.SagaReplies);
    return bus;
  }
  const endpoint = process.env.AWS_ENDPOINT_URL;
  const region = process.env.AWS_REGION ?? 'us-east-1';
  return new SqsSnsMessageBus({
    sqs: new SQSClient({ region, endpoint }),
    sns: new SNSClient({ region, endpoint }),
    queues: {
      [Destinations.ExecutionCommands]: required('EXECUTION_COMMANDS_QUEUE_URL'),
      [Destinations.BillingCommands]: required('BILLING_COMMANDS_QUEUE_URL'),
      [Destinations.SagaReplies]: required('SAGA_REPLIES_QUEUE_URL'),
    },
    topics: { [Destinations.EventosTopic]: required('EVENTS_TOPIC_ARN') },
  });
};

export interface SagaRuntime {
  uow: PostgresUnitOfWork;
  orchestrator: SagaOrchestrator;
  sagas: PostgresSagaRepository;
  historico: PostgresStatusHistoricoRepository;
  outbox: PostgresOutboxRepository;
}

let runtime: SagaRuntime | undefined;

/** Composition root da Saga; construção preguiçosa (o pool precisa estar conectado). */
export const getSagaRuntime = (): SagaRuntime => {
  if (runtime) return runtime;

  const uow = new PostgresUnitOfWork();
  const sagas = new PostgresSagaRepository();
  const historico = new PostgresStatusHistoricoRepository();
  const outbox = new PostgresOutboxRepository();
  const clientes = new PostgresClienteRepository();
  const notificationService = makeNotificationService();

  const orchestrator = new SagaOrchestrator({
    uow,
    sagas,
    ordens: new PostgresOrdemServicoRepository(),
    clientes,
    catalogo: new PostgresCatalogoServicoRepository(),
    pecas: new PostgresPecaRepository(),
    estoque: new InventoryService(new PostgresItemEstoqueRepository()),
    outbox,
    inbox: new PostgresInboxRepository(),
    historico,
    config: sagaConfigFromEnv(),
    onStatusChange: (os, anterior): void =>
      notificarMudancaStatusOS({ clienteRepo: clientes, notificationService }, os, anterior),
  });

  runtime = { uow, orchestrator, sagas, historico, outbox };
  return runtime;
};

export const makeOutboxRelay = (bus: IMessageBus): OutboxRelay => {
  const { uow, outbox } = getSagaRuntime();
  return new OutboxRelay(uow, outbox, bus, {
    intervalMs: Number(process.env.OUTBOX_RELAY_INTERVAL_MS ?? 1000),
  });
};
