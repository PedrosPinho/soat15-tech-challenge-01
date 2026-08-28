import { Router, Response, NextFunction } from 'express';
import {
  AuthenticatedRequest,
  authMiddleware,
  requireInternalScope,
} from '@presentation/middlewares/auth.middleware';
import { webhookAuthMiddleware } from '@presentation/middlewares/webhook-auth.middleware';
import {
  validateCreateOrdemServico,
  validateCancelarOS,
  validateAprovacaoWebhook,
} from '@presentation/validators/ordem-servico.validator';
import { makeOrdemServicoController } from '@main/factories/ordem-servico.factory';
import { OrdemServicoController } from '@presentation/controllers/ordem-servico.controller';
import { ForbiddenError } from '@shared/errors/domain.error';

const onlyDigits = (value: string): string => value.replace(/\D/g, '');

/**
 * `GET /buscar` é o mecanismo de "consulta de status das próprias OS" do
 * cliente (RFC-003/Etapa 2.3) — um token `scope: cliente` só pode consultar
 * o próprio CPF/CNPJ, comparado por dígitos para tolerar formatação
 * (pontos/traço) tanto no token quanto na query string. Usuário interno
 * consulta qualquer CPF/CNPJ livremente.
 */
const restrictBuscaToOwnCpf = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.scope === 'cliente') {
    const queryCpf = onlyDigits((req.query['cpfCnpj'] as string | undefined) ?? '');
    const tokenCpf = onlyDigits(req.cpfCnpj ?? '');
    if (!tokenCpf || queryCpf !== tokenCpf) {
      return next(new ForbiddenError('Cliente só pode consultar as próprias ordens de serviço'));
    }
  }
  next();
};

// Construção adiada para o primeiro request: os repositórios Postgres
// dependem do pool já conectado (`connectDatabase()`, chamado em `src/index.ts`
// antes do servidor começar a ouvir), diferente do Mongoose, que bufferizava
// comandos antes da conexão. Como as rotas são importadas antes da conexão
// acontecer, construir o controller no import quebraria o boot.
let controller: OrdemServicoController | undefined;
const getController = (): OrdemServicoController => (controller ??= makeOrdemServicoController());

export const ordemServicoRouter = Router();

ordemServicoRouter.get('/buscar', authMiddleware, restrictBuscaToOwnCpf, (req, res, next) =>
  getController().getOrdensByCpfCnpj(req, res, next),
);

ordemServicoRouter.post(
  '/',
  authMiddleware,
  requireInternalScope,
  validateCreateOrdemServico,
  (req, res, next) => getController().create(req, res, next),
);

ordemServicoRouter.get('/', authMiddleware, requireInternalScope, (req, res, next) =>
  getController().list(req, res, next),
);

ordemServicoRouter.get('/:id', authMiddleware, requireInternalScope, (req, res, next) =>
  getController().getById(req, res, next),
);

ordemServicoRouter.patch('/:id/iniciar', authMiddleware, requireInternalScope, (req, res, next) =>
  getController().iniciar(req, res, next),
);

ordemServicoRouter.patch(
  '/:id/aguardar-aprovacao',
  authMiddleware,
  requireInternalScope,
  (req, res, next) => getController().aguardarAprovacao(req, res, next),
);

ordemServicoRouter.patch('/:id/aprovar', authMiddleware, requireInternalScope, (req, res, next) =>
  getController().aprovar(req, res, next),
);

ordemServicoRouter.patch('/:id/concluir', authMiddleware, requireInternalScope, (req, res, next) =>
  getController().concluir(req, res, next),
);

ordemServicoRouter.patch('/:id/entregar', authMiddleware, requireInternalScope, (req, res, next) =>
  getController().entregar(req, res, next),
);

ordemServicoRouter.patch(
  '/:id/cancelar',
  authMiddleware,
  requireInternalScope,
  validateCancelarOS,
  (req, res, next) => getController().cancelar(req, res, next),
);

ordemServicoRouter.post(
  '/:id/orcamento/webhook',
  webhookAuthMiddleware,
  validateAprovacaoWebhook,
  (req, res, next) => getController().processarAprovacaoOrcamento(req, res, next),
);
