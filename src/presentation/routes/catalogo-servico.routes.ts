import { Router } from 'express';
import { CatalogoServicoController } from '@presentation/controllers/catalogo-servico.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import {
  validateCreateCatalogoServico,
  validateUpdateCatalogoServico,
} from '@presentation/validators/catalogo-servico.validator';
import { PostgresCatalogoServicoRepository } from '@infrastructure/database/postgres/repositories/catalogo-servico.repository.impl';
import { CreateCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/create-catalogo-servico.use-case';
import { GetCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/get-catalogo-servico.use-case';
import { UpdateCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/update-catalogo-servico.use-case';
import { ListCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/list-catalogo-servico.use-case';
import { DeleteCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/delete-catalogo-servico.use-case';

// Construção adiada para o primeiro request — ver comentário em ordem-servico.routes.ts.
let controller: CatalogoServicoController | undefined;
const getController = (): CatalogoServicoController => {
  if (!controller) {
    const repo = new PostgresCatalogoServicoRepository();
    controller = new CatalogoServicoController(
      new CreateCatalogoServicoUseCase(repo),
      new GetCatalogoServicoUseCase(repo),
      new UpdateCatalogoServicoUseCase(repo),
      new ListCatalogoServicoUseCase(repo),
      new DeleteCatalogoServicoUseCase(repo),
    );
  }
  return controller;
};

export const catalogoServicoRouter = Router();

catalogoServicoRouter.post('/', authMiddleware, validateCreateCatalogoServico, (req, res, next) =>
  getController().create(req, res, next),
);

catalogoServicoRouter.get('/', authMiddleware, (req, res, next) =>
  getController().list(req, res, next),
);

catalogoServicoRouter.get('/:id', authMiddleware, (req, res, next) =>
  getController().getById(req, res, next),
);

catalogoServicoRouter.put('/:id', authMiddleware, validateUpdateCatalogoServico, (req, res, next) =>
  getController().update(req, res, next),
);

catalogoServicoRouter.delete('/:id', authMiddleware, (req, res, next) =>
  getController().delete(req, res, next),
);
