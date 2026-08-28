import { Router } from 'express';
import { VeiculoController } from '@presentation/controllers/veiculo.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import {
  validateCreateVeiculo,
  validateUpdateVeiculo,
} from '@presentation/validators/veiculo.validator';
import { PostgresVeiculoRepository } from '@infrastructure/database/postgres/repositories/veiculo.repository.impl';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { CreateVeiculoUseCase } from '@application/use-cases/veiculo/create-veiculo.use-case';
import { GetVeiculoUseCase } from '@application/use-cases/veiculo/get-veiculo.use-case';
import { UpdateVeiculoUseCase } from '@application/use-cases/veiculo/update-veiculo.use-case';
import { ListVeiculosByClienteUseCase } from '@application/use-cases/veiculo/list-veiculos-by-cliente.use-case';

// Construção adiada para o primeiro request — ver comentário em ordem-servico.routes.ts.
let controller: VeiculoController | undefined;
const getController = (): VeiculoController => {
  if (!controller) {
    const veiculoRepo = new PostgresVeiculoRepository();
    const clienteRepo = new PostgresClienteRepository();
    controller = new VeiculoController(
      new CreateVeiculoUseCase(veiculoRepo, clienteRepo),
      new GetVeiculoUseCase(veiculoRepo),
      new UpdateVeiculoUseCase(veiculoRepo),
      new ListVeiculosByClienteUseCase(veiculoRepo, clienteRepo),
    );
  }
  return controller;
};

export const veiculoRouter = Router();

veiculoRouter.post('/', authMiddleware, validateCreateVeiculo, (req, res, next) =>
  getController().create(req, res, next),
);

veiculoRouter.get('/:id', authMiddleware, (req, res, next) =>
  getController().getById(req, res, next),
);

veiculoRouter.put('/:id', authMiddleware, validateUpdateVeiculo, (req, res, next) =>
  getController().update(req, res, next),
);

// Mounted separately under /api/clientes/:clienteId/veiculos
export const veiculosByClienteRouter = Router({ mergeParams: true });

veiculosByClienteRouter.get('/', authMiddleware, (req, res, next) =>
  getController().listByCliente(req, res, next),
);
