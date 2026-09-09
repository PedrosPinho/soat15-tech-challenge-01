import { Router } from 'express';
import { ClienteController } from '@presentation/controllers/cliente.controller';
import { authMiddleware, requireInternalScope } from '@presentation/middlewares/auth.middleware';
import {
  validateCreateCliente,
  validateUpdateCliente,
} from '@presentation/validators/cliente.validator';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { CreateClienteUseCase } from '@application/use-cases/cliente/create-cliente.use-case';
import { GetClienteUseCase } from '@application/use-cases/cliente/get-cliente.use-case';
import { ListClientesUseCase } from '@application/use-cases/cliente/list-clientes.use-case';
import { UpdateClienteUseCase } from '@application/use-cases/cliente/update-cliente.use-case';
import { DeactivateClienteUseCase } from '@application/use-cases/cliente/deactivate-cliente.use-case';

// Construção adiada para o primeiro request — ver comentário em ordem-servico.routes.ts.
let controller: ClienteController | undefined;
const getController = (): ClienteController => {
  if (!controller) {
    const repo = new PostgresClienteRepository();
    controller = new ClienteController(
      new CreateClienteUseCase(repo),
      new GetClienteUseCase(repo),
      new ListClientesUseCase(repo),
      new UpdateClienteUseCase(repo),
      new DeactivateClienteUseCase(repo),
    );
  }
  return controller;
};

export const clienteRouter = Router();

clienteRouter.post('/', authMiddleware, requireInternalScope, validateCreateCliente, (req, res, next) =>
  getController().create(req, res, next),
);

clienteRouter.get('/', authMiddleware, requireInternalScope, (req, res, next) => getController().list(req, res, next));

clienteRouter.get('/:id', authMiddleware, requireInternalScope, (req, res, next) =>
  getController().getById(req, res, next),
);

clienteRouter.put('/:id', authMiddleware, requireInternalScope, validateUpdateCliente, (req, res, next) =>
  getController().update(req, res, next),
);

clienteRouter.delete('/:id', authMiddleware, requireInternalScope, (req, res, next) =>
  getController().deactivate(req, res, next),
);
