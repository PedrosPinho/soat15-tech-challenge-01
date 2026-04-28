import { Router } from 'express';
import { CatalogoServicoController } from '@presentation/controllers/catalogo-servico.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import {
  validateCreateCatalogoServico,
  validateUpdateCatalogoServico,
} from '@presentation/validators/catalogo-servico.validator';
import { MongoCatalogoServicoRepository } from '@infrastructure/database/mongodb/repositories/catalogo-servico.repository.impl';
import { CreateCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/create-catalogo-servico.use-case';
import { GetCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/get-catalogo-servico.use-case';
import { UpdateCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/update-catalogo-servico.use-case';
import { ListCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/list-catalogo-servico.use-case';
import { DeleteCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/delete-catalogo-servico.use-case';

const repo = new MongoCatalogoServicoRepository();

const controller = new CatalogoServicoController(
  new CreateCatalogoServicoUseCase(repo),
  new GetCatalogoServicoUseCase(repo),
  new UpdateCatalogoServicoUseCase(repo),
  new ListCatalogoServicoUseCase(repo),
  new DeleteCatalogoServicoUseCase(repo),
);

export const catalogoServicoRouter = Router();

catalogoServicoRouter.post('/', authMiddleware, validateCreateCatalogoServico, (req, res, next) =>
  controller.create(req, res, next),
);

catalogoServicoRouter.get('/', authMiddleware, (req, res, next) => controller.list(req, res, next));

catalogoServicoRouter.get('/:id', authMiddleware, (req, res, next) =>
  controller.getById(req, res, next),
);

catalogoServicoRouter.put('/:id', authMiddleware, validateUpdateCatalogoServico, (req, res, next) =>
  controller.update(req, res, next),
);

catalogoServicoRouter.delete('/:id', authMiddleware, (req, res, next) =>
  controller.delete(req, res, next),
);
