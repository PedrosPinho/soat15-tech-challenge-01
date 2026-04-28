import { Router } from 'express';
import { RelatoriosController } from '@presentation/controllers/relatorios.controller';
import { authMiddleware } from '@presentation/middlewares/auth.middleware';
import { MongoOrdemServicoRepository } from '@infrastructure/database/mongodb/repositories/ordem-servico.repository.impl';
import { MongoPagamentoRepository } from '@infrastructure/database/mongodb/repositories/pagamento.repository.impl';
import { MongoItemEstoqueRepository } from '@infrastructure/database/mongodb/repositories/item-estoque.repository.impl';
import { DashboardUseCase } from '@application/use-cases/relatorios/dashboard.use-case';

const controller = new RelatoriosController(
  new DashboardUseCase(
    new MongoOrdemServicoRepository(),
    new MongoPagamentoRepository(),
    new MongoItemEstoqueRepository(),
  ),
);

export const relatoriosRouter = Router();

relatoriosRouter.get('/dashboard', authMiddleware, (req, res, next) =>
  controller.getDashboard(req, res, next),
);
