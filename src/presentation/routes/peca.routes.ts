import { Router } from 'express';
import { PecaController } from '@presentation/controllers/peca.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import { validateCreatePeca, validateUpdatePeca } from '@presentation/validators/peca.validator';
import { MongoPecaRepository } from '@infrastructure/database/mongodb/repositories/peca.repository.impl';
import { CreatePecaUseCase } from '@application/use-cases/peca/create-peca.use-case';
import { GetPecaUseCase } from '@application/use-cases/peca/get-peca.use-case';
import { UpdatePecaUseCase } from '@application/use-cases/peca/update-peca.use-case';
import { ListPecasUseCase } from '@application/use-cases/peca/list-pecas.use-case';
import { DeactivatePecaUseCase } from '@application/use-cases/peca/deactivate-peca.use-case';

const repo = new MongoPecaRepository();

const controller = new PecaController(
  new CreatePecaUseCase(repo),
  new GetPecaUseCase(repo),
  new UpdatePecaUseCase(repo),
  new ListPecasUseCase(repo),
  new DeactivatePecaUseCase(repo),
);

export const pecaRouter = Router();

pecaRouter.post('/', authMiddleware, validateCreatePeca, (req, res, next) =>
  controller.create(req, res, next),
);

pecaRouter.get('/', authMiddleware, (req, res, next) => controller.list(req, res, next));

pecaRouter.get('/:id', authMiddleware, (req, res, next) => controller.getById(req, res, next));

pecaRouter.put('/:id', authMiddleware, validateUpdatePeca, (req, res, next) =>
  controller.update(req, res, next),
);

pecaRouter.delete('/:id', authMiddleware, (req, res, next) =>
  controller.deactivate(req, res, next),
);
