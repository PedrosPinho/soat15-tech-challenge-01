import { Request, Response, NextFunction } from 'express';
import { CreatePagamentoUseCase } from '@application/use-cases/pagamento/create-pagamento.use-case';
import { GetPagamentoUseCase } from '@application/use-cases/pagamento/get-pagamento.use-case';
import { ListPagamentosUseCase } from '@application/use-cases/pagamento/list-pagamentos.use-case';
import { StatusPagamento } from '@domain/entities/pagamento.entity';

export class PagamentoController {
  constructor(
    private readonly createPagamento: CreatePagamentoUseCase,
    private readonly getPagamento: GetPagamentoUseCase,
    private readonly listPagamentos: ListPagamentosUseCase,
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.createPagamento.execute(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getPagamento.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listPagamentos.execute({
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        ordemServicoId: req.query.ordemServicoId as string | undefined,
        status: req.query.status as StatusPagamento | undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
