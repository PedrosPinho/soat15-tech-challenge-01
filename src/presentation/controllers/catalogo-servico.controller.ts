import { Request, Response, NextFunction } from 'express';
import { CreateCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/create-catalogo-servico.use-case';
import { GetCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/get-catalogo-servico.use-case';
import { UpdateCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/update-catalogo-servico.use-case';
import { ListCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/list-catalogo-servico.use-case';
import { DeleteCatalogoServicoUseCase } from '@application/use-cases/catalogo-servico/delete-catalogo-servico.use-case';

export class CatalogoServicoController {
  constructor(
    private readonly createUC: CreateCatalogoServicoUseCase,
    private readonly getUC: GetCatalogoServicoUseCase,
    private readonly updateUC: UpdateCatalogoServicoUseCase,
    private readonly listUC: ListCatalogoServicoUseCase,
    private readonly deleteUC: DeleteCatalogoServicoUseCase,
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.createUC.execute(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getUC.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.updateUC.execute(req.params['id'] as string, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listUC.execute({
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        search: req.query.search as string | undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.deleteUC.execute(req.params['id'] as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
