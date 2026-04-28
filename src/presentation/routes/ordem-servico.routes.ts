import { Router } from 'express';
import { OrdemServicoController } from '@presentation/controllers/ordem-servico.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import {
  validateCreateOrdemServico,
  validateCancelarOS,
} from '@presentation/validators/ordem-servico.validator';
import { MongoOrdemServicoRepository } from '@infrastructure/database/mongodb/repositories/ordem-servico.repository.impl';
import { MongoClienteRepository } from '@infrastructure/database/mongodb/repositories/cliente.repository.impl';
import { MongoVeiculoRepository } from '@infrastructure/database/mongodb/repositories/veiculo.repository.impl';
import { CreateOrdemServicoUseCase } from '@application/use-cases/ordem-servico/create-ordem-servico.use-case';
import { GetOrdemServicoUseCase } from '@application/use-cases/ordem-servico/get-ordem-servico.use-case';
import { ListOrdensServicoUseCase } from '@application/use-cases/ordem-servico/list-ordens-servico.use-case';
import { IniciarOSUseCase } from '@application/use-cases/ordem-servico/iniciar-os.use-case';
import { ConcluirOSUseCase } from '@application/use-cases/ordem-servico/concluir-os.use-case';
import { CancelarOSUseCase } from '@application/use-cases/ordem-servico/cancelar-os.use-case';

const osRepo = new MongoOrdemServicoRepository();
const clienteRepo = new MongoClienteRepository();
const veiculoRepo = new MongoVeiculoRepository();

const controller = new OrdemServicoController(
  new CreateOrdemServicoUseCase(osRepo, clienteRepo, veiculoRepo),
  new GetOrdemServicoUseCase(osRepo),
  new ListOrdensServicoUseCase(osRepo),
  new IniciarOSUseCase(osRepo),
  new ConcluirOSUseCase(osRepo),
  new CancelarOSUseCase(osRepo),
);

export const ordemServicoRouter = Router();

ordemServicoRouter.post('/', authMiddleware, validateCreateOrdemServico, (req, res, next) =>
  controller.create(req, res, next),
);

ordemServicoRouter.get('/', authMiddleware, (req, res, next) =>
  controller.list(req, res, next),
);

ordemServicoRouter.get('/:id', authMiddleware, (req, res, next) =>
  controller.getById(req, res, next),
);

ordemServicoRouter.patch('/:id/iniciar', authMiddleware, (req, res, next) =>
  controller.iniciar(req, res, next),
);

ordemServicoRouter.patch('/:id/concluir', authMiddleware, (req, res, next) =>
  controller.concluir(req, res, next),
);

ordemServicoRouter.patch('/:id/cancelar', authMiddleware, validateCancelarOS, (req, res, next) =>
  controller.cancelar(req, res, next),
);
