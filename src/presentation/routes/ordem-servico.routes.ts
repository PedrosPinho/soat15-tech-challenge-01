import { Router } from 'express';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import { webhookAuthMiddleware } from '@presentation/middlewares/webhook-auth.middleware';
import {
  validateCreateOrdemServico,
  validateCancelarOS,
  validateAprovacaoWebhook,
} from '@presentation/validators/ordem-servico.validator';
import { makeOrdemServicoController } from '@main/factories/ordem-servico.factory';
import { OrdemServicoController } from '@presentation/controllers/ordem-servico.controller';

// Construção adiada para o primeiro request: os repositórios Postgres
// dependem do pool já conectado (`connectDatabase()`, chamado em `src/index.ts`
// antes do servidor começar a ouvir), diferente do Mongoose, que bufferizava
// comandos antes da conexão. Como as rotas são importadas antes da conexão
// acontecer, construir o controller no import quebraria o boot.
let controller: OrdemServicoController | undefined;
const getController = (): OrdemServicoController => (controller ??= makeOrdemServicoController());

export const ordemServicoRouter = Router();

ordemServicoRouter.get('/buscar', (req, res, next) =>
  getController().getOrdensByCpfCnpj(req, res, next),
);

ordemServicoRouter.post('/', authMiddleware, validateCreateOrdemServico, (req, res, next) =>
  getController().create(req, res, next),
);

ordemServicoRouter.get('/', authMiddleware, (req, res, next) => getController().list(req, res, next));

ordemServicoRouter.get('/:id', authMiddleware, (req, res, next) =>
  getController().getById(req, res, next),
);

ordemServicoRouter.patch('/:id/iniciar', authMiddleware, (req, res, next) =>
  getController().iniciar(req, res, next),
);

ordemServicoRouter.patch('/:id/aguardar-aprovacao', authMiddleware, (req, res, next) =>
  getController().aguardarAprovacao(req, res, next),
);

ordemServicoRouter.patch('/:id/aprovar', authMiddleware, (req, res, next) =>
  getController().aprovar(req, res, next),
);

ordemServicoRouter.patch('/:id/concluir', authMiddleware, (req, res, next) =>
  getController().concluir(req, res, next),
);

ordemServicoRouter.patch('/:id/entregar', authMiddleware, (req, res, next) =>
  getController().entregar(req, res, next),
);

ordemServicoRouter.patch('/:id/cancelar', authMiddleware, validateCancelarOS, (req, res, next) =>
  getController().cancelar(req, res, next),
);

ordemServicoRouter.post(
  '/:id/orcamento/webhook',
  webhookAuthMiddleware,
  validateAprovacaoWebhook,
  (req, res, next) => getController().processarAprovacaoOrcamento(req, res, next),
);
