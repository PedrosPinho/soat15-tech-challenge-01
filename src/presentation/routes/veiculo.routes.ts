import { Router } from 'express';
import { VeiculoController } from '@presentation/controllers/veiculo.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import {
  validateCreateVeiculo,
  validateUpdateVeiculo,
} from '@presentation/validators/veiculo.validator';
import { MongoVeiculoRepository } from '@infrastructure/database/mongodb/repositories/veiculo.repository.impl';
import { MongoClienteRepository } from '@infrastructure/database/mongodb/repositories/cliente.repository.impl';
import { CreateVeiculoUseCase } from '@application/use-cases/veiculo/create-veiculo.use-case';
import { GetVeiculoUseCase } from '@application/use-cases/veiculo/get-veiculo.use-case';
import { UpdateVeiculoUseCase } from '@application/use-cases/veiculo/update-veiculo.use-case';
import { ListVeiculosByClienteUseCase } from '@application/use-cases/veiculo/list-veiculos-by-cliente.use-case';

const veiculoRepo = new MongoVeiculoRepository();
const clienteRepo = new MongoClienteRepository();

const controller = new VeiculoController(
  new CreateVeiculoUseCase(veiculoRepo, clienteRepo),
  new GetVeiculoUseCase(veiculoRepo),
  new UpdateVeiculoUseCase(veiculoRepo),
  new ListVeiculosByClienteUseCase(veiculoRepo, clienteRepo),
);

export const veiculoRouter = Router();

veiculoRouter.post('/', authMiddleware, validateCreateVeiculo, (req, res, next) =>
  controller.create(req, res, next),
);

veiculoRouter.get('/:id', authMiddleware, (req, res, next) => controller.getById(req, res, next));

veiculoRouter.put('/:id', authMiddleware, validateUpdateVeiculo, (req, res, next) =>
  controller.update(req, res, next),
);

// Mounted separately under /api/clientes/:clienteId/veiculos
export const veiculosByClienteRouter = Router({ mergeParams: true });

veiculosByClienteRouter.get('/', authMiddleware, (req, res, next) =>
  controller.listByCliente(req, res, next),
);
