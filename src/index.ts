// Precisa ser o primeiro require do processo -- o agente instrumenta módulos
// (http, pg, etc.) ao serem carregados, então qualquer import acima dele
// escaparia da instrumentação. Sem NEW_RELIC_LICENSE_KEY configurada (ver
// docs/PHASE_3_PLAN.md, Etapa 5), o agente detecta a licença ausente e fica
// desabilitado sem lançar erro -- seguro mesmo antes da conta New Relic
// existir, inclusive em teste de integração (`tests/integration/health.spec.ts`
// importa este arquivo).
// eslint-disable-next-line @typescript-eslint/no-var-requires
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
import { pagamentoRouter } from '@presentation/routes/pagamento.routes';
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
app.use('/api/pagamentos', pagamentoRouter);
app.use('/api/relatorios', relatoriosRouter);
app.use('/api/servicos', catalogoServicoRouter);

app.use(errorHandler);

let httpServer: ReturnType<Application['listen']> | undefined;

const startServer = async (): Promise<void> => {
  try {
    // As rotas (importadas acima) constroem seus repositórios Postgres de
    // forma preguiçosa, no primeiro request — mas o pool precisa estar
    // conectado antes que o servidor comece a aceitar requisições.
    await connectDatabase();
    logger.info('Database connected successfully');

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
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

startServer();

export { app };
