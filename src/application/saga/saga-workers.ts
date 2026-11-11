import { IMessageBus, Subscription } from '@domain/services/message-bus';
import { Destinations } from '@shared/messaging/messages';
import { PeriodicTask } from '@application/messaging/periodic-task';
import { SagaOrchestrator } from './saga-orchestrator';

/** Consome `os-saga-replies`; idempotência garantida pelo inbox dentro do orquestrador. */
export const startSagaReplyConsumer = (
  bus: IMessageBus,
  orchestrator: SagaOrchestrator,
): Promise<Subscription> =>
  bus.subscribe(Destinations.SagaReplies, (message) => orchestrator.handleReply(message));

/** Sweeper de timeout das esperas (aprovação, pagamento) e de compensações travadas. */
export const createSagaTimeoutSweeper = (
  orchestrator: SagaOrchestrator,
  intervalMs: number,
): PeriodicTask =>
  new PeriodicTask('saga-timeout-sweeper', intervalMs, () => orchestrator.processarExpiradas());
