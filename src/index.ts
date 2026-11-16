// Precisa ser o primeiro require do processo -- o agente instrumenta módulos
// (http, pg, etc.) ao serem carregados, então qualquer import acima dele
// escaparia da instrumentação. Sem NEW_RELIC_LICENSE_KEY configurada (ver
// docs/PHASE_3_PLAN.md, Etapa 5), o agente detecta a licença ausente e fica
// desabilitado sem lançar erro -- seguro mesmo antes da conta New Relic
// existir, inclusive em teste de integração (`tests/integration/health.spec.ts`
// importa este arquivo).
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('newrelic');

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { connectDatabase, disconnectDatabase } from '@infrastructure/database/postgres/pool';
import { correlationIdMiddleware } from '@presentation/middlewares/correlation-id.middleware';
import { errorHandler } from '@presentation/middlewares/error.middleware';
import { logger } from '@shared/logger';
import { swaggerSpec, swaggerUiOptions } from './swagger';
import { healthRouter } from '@presentation/routes/health.routes';
import { authRouter } from '@presentation/routes/auth.routes';
import { clienteRouter } from '@presentation/routes/cliente.routes';
import { veiculoRouter, veiculosByClienteRouter } from '@presentation/routes/veiculo.routes';
import { pecaRouter } from '@presentation/routes/peca.routes';
import { ordemServicoRouter } from '@presentation/routes/ordem-servico.routes';
import { internalRouter } from '@presentation/routes/internal.routes';
import {
  getSagaRuntime,
  makeMessageBus,
  makeOutboxRelay,
  makeQueueDepthCollector,
} from '@main/factories/saga.factory';
import { createSagaTimeoutSweeper, startSagaReplyConsumer } from '@application/saga/saga-workers';
import { Subscription } from '@domain/services/message-bus';
import { OutboxRelay } from '@application/messaging/outbox-relay';
import { PeriodicTask } from '@application/messaging/periodic-task';
import { QueueDepthCollector } from '@infrastructure/messaging/queue-depth-collector';
import { relatoriosRouter } from '@presentation/routes/relatorios.routes';
import { catalogoServicoRouter } from '@presentation/routes/catalogo-servico.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }),
);
app.use(correlationIdMiddleware);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/clientes', clienteRouter);
app.use('/api/veiculos', veiculoRouter);
app.use('/api/clientes/:clienteId/veiculos', veiculosByClienteRouter);
app.use('/api/pecas', pecaRouter);
app.use('/api/ordens-servico', ordemServicoRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/servicos', catalogoServicoRouter);
// Fora do prefixo /api e do API Gateway: chamadas serviço-a-serviço (ex.: Lambda de auth).
app.use('/internal', internalRouter);

app.use(errorHandler);

let httpServer: ReturnType<Application['listen']> | undefined;
let relay: OutboxRelay | undefined;
let sweeper: PeriodicTask | undefined;
let queueDepth: QueueDepthCollector | undefined;
let replySubscription: Subscription | undefined;

/**
 * Mensageria da Saga: relay do outbox, consumidor de `os-saga-replies` e
 * sweeper de timeouts. `MESSAGING_ENABLED=false` sobe só a API (útil em testes
 * de integração e em dev sem LocalStack).
 */
const startMessaging = async (): Promise<void> => {
  if (process.env.MESSAGING_ENABLED === 'false') {
    logger.warn('MESSAGING_ENABLED=false: Saga e mensageria desligadas');
    return;
  }
  const bus = makeMessageBus();
  const { orchestrator } = getSagaRuntime();
  relay = makeOutboxRelay(bus);
  relay.start();
  replySubscription = await startSagaReplyConsumer(bus, orchestrator);
  sweeper = createSagaTimeoutSweeper(
    orchestrator,
    Number(process.env.SAGA_SWEEPER_INTERVAL_MS ?? 15_000),
  );
  sweeper.start();
  queueDepth = makeQueueDepthCollector(bus);
  queueDepth?.start();
  logger.info('Mensageria da Saga iniciada');
};

const startServer = async (): Promise<void> => {
  try {
    // As rotas (importadas acima) constroem seus repositórios Postgres de
    // forma preguiçosa, no primeiro request — mas o pool precisa estar
    // conectado antes que o servidor comece a aceitar requisições.
    await connectDatabase();
    logger.info('Database connected successfully');

    await startMessaging();

    httpServer = app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server running');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Signal received: closing server');
  httpServer?.close();
  await replySubscription?.stop();
  await sweeper?.stop();
  await relay?.stop();
  await queueDepth?.stop();
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

startServer();

export { app };
