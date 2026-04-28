import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDatabase } from '@infrastructure/database/mongodb/connection';
import { errorHandler } from '@presentation/middlewares/error.middleware';
import { healthRouter } from '@presentation/routes/health.routes';
import { authRouter } from '@presentation/routes/auth.routes';
import { clienteRouter } from '@presentation/routes/cliente.routes';
import { veiculoRouter, veiculosByClienteRouter } from '@presentation/routes/veiculo.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/clientes', clienteRouter);
app.use('/api/veiculos', veiculoRouter);
app.use('/api/clientes/:clienteId/veiculos', veiculosByClienteRouter);

app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    console.warn('Database connected successfully');

    app.listen(PORT, () => {
      console.warn(`Server running on port ${PORT}`);
      console.warn(`Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  console.warn('SIGTERM received: closing server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.warn('SIGINT received: closing server');
  process.exit(0);
});

startServer();

export { app };
