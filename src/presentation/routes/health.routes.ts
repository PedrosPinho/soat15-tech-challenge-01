import { Router } from 'express';
import { HealthController } from '@presentation/controllers/health.controller';

export const healthRouter = Router();
const healthController = new HealthController();

healthRouter.get('/', (req, res) => healthController.check(req, res));
