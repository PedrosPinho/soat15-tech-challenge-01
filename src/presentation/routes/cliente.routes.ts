import { Router } from 'express';
import { ClienteController } from '@presentation/controllers/cliente.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import { validateCreateCliente, validateUpdateCliente } from '@presentation/validators/cliente.validator';
import { MongoClienteRepository } from '@infrastructure/database/mongodb/repositories/cliente.repository.impl';
import { CreateClienteUseCase } from '@application/use-cases/cliente/create-cliente.use-case';
import { GetClienteUseCase } from '@application/use-cases/cliente/get-cliente.use-case';
import { ListClientesUseCase } from '@application/use-cases/cliente/list-clientes.use-case';
import { UpdateClienteUseCase } from '@application/use-cases/cliente/update-cliente.use-case';
import { DeactivateClienteUseCase } from '@application/use-cases/cliente/deactivate-cliente.use-case';

const repo = new MongoClienteRepository();

const controller = new ClienteController(
  new CreateClienteUseCase(repo),
  new GetClienteUseCase(repo),
  new ListClientesUseCase(repo),
  new UpdateClienteUseCase(repo),
  new DeactivateClienteUseCase(repo),
);

export const clienteRouter = Router();

clienteRouter.post('/', authMiddleware, validateCreateCliente, (req, res, next) =>
  controller.create(req, res, next),
);

clienteRouter.get('/', authMiddleware, (req, res, next) =>
  controller.list(req, res, next),
);

clienteRouter.get('/:id', authMiddleware, (req, res, next) =>
  controller.getById(req, res, next),
);

clienteRouter.put('/:id', authMiddleware, validateUpdateCliente, (req, res, next) =>
  controller.update(req, res, next),
);

clienteRouter.delete('/:id', authMiddleware, (req, res, next) =>
  controller.deactivate(req, res, next),
);
