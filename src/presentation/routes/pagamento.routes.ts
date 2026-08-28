import { Router } from 'express';
import { PagamentoController } from '@presentation/controllers/pagamento.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import { validateCreatePagamento } from '@presentation/validators/pagamento.validator';
import { PostgresPagamentoRepository } from '@infrastructure/database/postgres/repositories/pagamento.repository.impl';
import { PostgresOrdemServicoRepository } from '@infrastructure/database/postgres/repositories/ordem-servico.repository.impl';
import { CreatePagamentoUseCase } from '@application/use-cases/pagamento/create-pagamento.use-case';
import { GetPagamentoUseCase } from '@application/use-cases/pagamento/get-pagamento.use-case';
import { ListPagamentosUseCase } from '@application/use-cases/pagamento/list-pagamentos.use-case';

// Construção adiada para o primeiro request — ver comentário em ordem-servico.routes.ts.
let controller: PagamentoController | undefined;
const getController = (): PagamentoController => {
  if (!controller) {
    const pagamentoRepo = new PostgresPagamentoRepository();
    const osRepo = new PostgresOrdemServicoRepository();
    controller = new PagamentoController(
      new CreatePagamentoUseCase(pagamentoRepo, osRepo),
      new GetPagamentoUseCase(pagamentoRepo),
      new ListPagamentosUseCase(pagamentoRepo),
    );
  }
  return controller;
};

export const pagamentoRouter = Router();

pagamentoRouter.post('/', authMiddleware, validateCreatePagamento, (req, res, next) =>
  getController().create(req, res, next),
);

pagamentoRouter.get('/', authMiddleware, (req, res, next) => getController().list(req, res, next));

pagamentoRouter.get('/:id', authMiddleware, (req, res, next) =>
  getController().getById(req, res, next),
);
