import { Router } from 'express';
import { RelatoriosController } from '@presentation/controllers/relatorios.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import { PostgresOrdemServicoRepository } from '@infrastructure/database/postgres/repositories/ordem-servico.repository.impl';
import { PostgresPagamentoRepository } from '@infrastructure/database/postgres/repositories/pagamento.repository.impl';
import { PostgresItemEstoqueRepository } from '@infrastructure/database/postgres/repositories/item-estoque.repository.impl';
import { DashboardUseCase } from '@application/use-cases/relatorios/dashboard.use-case';

// Construção adiada para o primeiro request — ver comentário em ordem-servico.routes.ts.
let controller: RelatoriosController | undefined;
const getController = (): RelatoriosController => {
  if (!controller) {
    controller = new RelatoriosController(
      new DashboardUseCase(
        new PostgresOrdemServicoRepository(),
        new PostgresPagamentoRepository(),
        new PostgresItemEstoqueRepository(),
      ),
    );
  }
  return controller;
};

export const relatoriosRouter = Router();

relatoriosRouter.get('/dashboard', authMiddleware, (req, res, next) =>
  getController().getDashboard(req, res, next),
);
