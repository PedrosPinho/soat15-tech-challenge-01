import { Router } from 'express';
import { PagamentoController } from '@presentation/controllers/pagamento.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import { validateCreatePagamento } from '@presentation/validators/pagamento.validator';
import { MongoPagamentoRepository } from '@infrastructure/database/mongodb/repositories/pagamento.repository.impl';
import { MongoOrdemServicoRepository } from '@infrastructure/database/mongodb/repositories/ordem-servico.repository.impl';
import { CreatePagamentoUseCase } from '@application/use-cases/pagamento/create-pagamento.use-case';
import { GetPagamentoUseCase } from '@application/use-cases/pagamento/get-pagamento.use-case';
import { ListPagamentosUseCase } from '@application/use-cases/pagamento/list-pagamentos.use-case';

const pagamentoRepo = new MongoPagamentoRepository();
const osRepo = new MongoOrdemServicoRepository();

const controller = new PagamentoController(
  new CreatePagamentoUseCase(pagamentoRepo, osRepo),
  new GetPagamentoUseCase(pagamentoRepo),
  new ListPagamentosUseCase(pagamentoRepo),
);

export const pagamentoRouter = Router();

pagamentoRouter.post('/', authMiddleware, validateCreatePagamento, (req, res, next) =>
  controller.create(req, res, next),
);

pagamentoRouter.get('/', authMiddleware, (req, res, next) => controller.list(req, res, next));

pagamentoRouter.get('/:id', authMiddleware, (req, res, next) => controller.getById(req, res, next));
