import { Router } from 'express';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import { webhookAuthMiddleware } from '@presentation/middlewares/webhook-auth.middleware';
import {
  validateCreateOrdemServico,
  validateCancelarOS,
  validateAprovacaoWebhook,
} from '@presentation/validators/ordem-servico.validator';
import { makeOrdemServicoController } from '@main/factories/ordem-servico.factory';

const controller = makeOrdemServicoController();

export const ordemServicoRouter = Router();

ordemServicoRouter.get('/buscar', (req, res, next) =>
  controller.getOrdensByCpfCnpj(req, res, next),
);

ordemServicoRouter.post('/', authMiddleware, validateCreateOrdemServico, (req, res, next) =>
  controller.create(req, res, next),
);

ordemServicoRouter.get('/', authMiddleware, (req, res, next) => controller.list(req, res, next));

ordemServicoRouter.get('/:id', authMiddleware, (req, res, next) =>
  controller.getById(req, res, next),
);

ordemServicoRouter.patch('/:id/iniciar', authMiddleware, (req, res, next) =>
  controller.iniciar(req, res, next),
);

ordemServicoRouter.patch('/:id/aguardar-aprovacao', authMiddleware, (req, res, next) =>
  controller.aguardarAprovacao(req, res, next),
);

ordemServicoRouter.patch('/:id/aprovar', authMiddleware, (req, res, next) =>
  controller.aprovar(req, res, next),
);

ordemServicoRouter.patch('/:id/concluir', authMiddleware, (req, res, next) =>
  controller.concluir(req, res, next),
);

ordemServicoRouter.patch('/:id/entregar', authMiddleware, (req, res, next) =>
  controller.entregar(req, res, next),
);

ordemServicoRouter.patch('/:id/cancelar', authMiddleware, validateCancelarOS, (req, res, next) =>
  controller.cancelar(req, res, next),
);

ordemServicoRouter.post(
  '/:id/orcamento/webhook',
  webhookAuthMiddleware,
  validateAprovacaoWebhook,
  (req, res, next) => controller.processarAprovacaoOrcamento(req, res, next),
);
