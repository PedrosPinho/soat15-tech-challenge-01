import { Request, Response, NextFunction } from 'express';
import { CreatePecaUseCase } from '@application/use-cases/peca/create-peca.use-case';
import { GetPecaUseCase } from '@application/use-cases/peca/get-peca.use-case';
import { UpdatePecaUseCase } from '@application/use-cases/peca/update-peca.use-case';
import { ListPecasUseCase } from '@application/use-cases/peca/list-pecas.use-case';
import { DeactivatePecaUseCase } from '@application/use-cases/peca/deactivate-peca.use-case';
import { CategoriaPeca } from '@domain/entities/peca.entity';

export class PecaController {
  constructor(
    private readonly createPeca: CreatePecaUseCase,
    private readonly getPeca: GetPecaUseCase,
    private readonly updatePeca: UpdatePecaUseCase,
    private readonly listPecas: ListPecasUseCase,
    private readonly deactivatePeca: DeactivatePecaUseCase,
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.createPeca.execute(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getPeca.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.updatePeca.execute(req.params['id'] as string, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listPecas.execute({
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        categoria: req.query.categoria as CategoriaPeca | undefined,
        search: req.query.search as string | undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.deactivatePeca.execute(req.params['id'] as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
