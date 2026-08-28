import { Router } from 'express';
import { HealthController } from '@presentation/controllers/health.controller';

export const healthRouter = Router();
const healthController = new HealthController();

healthRouter.get('/live', (req, res) => healthController.live(req, res));
healthRouter.get('/ready', (req, res) => healthController.ready(req, res));
// Alias de compatibilidade: comportamento idêntico ao endpoint único de antes.
healthRouter.get('/', (req, res) => healthController.ready(req, res));
