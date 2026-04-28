import { Request, Response, NextFunction } from 'express';
import { DashboardUseCase } from '@application/use-cases/relatorios/dashboard.use-case';

export class RelatoriosController {
  constructor(private readonly dashboard: DashboardUseCase) {}

  async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.dashboard.execute();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
