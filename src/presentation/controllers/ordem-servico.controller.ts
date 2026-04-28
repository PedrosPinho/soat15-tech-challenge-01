import { Request, Response, NextFunction } from 'express';
import { CreateOrdemServicoUseCase } from '@application/use-cases/ordem-servico/create-ordem-servico.use-case';
import { GetOrdemServicoUseCase } from '@application/use-cases/ordem-servico/get-ordem-servico.use-case';
import { ListOrdensServicoUseCase } from '@application/use-cases/ordem-servico/list-ordens-servico.use-case';
import { IniciarOSUseCase } from '@application/use-cases/ordem-servico/iniciar-os.use-case';
import { ConcluirOSUseCase } from '@application/use-cases/ordem-servico/concluir-os.use-case';
import { CancelarOSUseCase } from '@application/use-cases/ordem-servico/cancelar-os.use-case';
import { StatusOS } from '@domain/entities/ordem-servico.entity';

export class OrdemServicoController {
  constructor(
    private readonly createOS: CreateOrdemServicoUseCase,
    private readonly getOS: GetOrdemServicoUseCase,
    private readonly listOS: ListOrdensServicoUseCase,
    private readonly iniciarOS: IniciarOSUseCase,
    private readonly concluirOS: ConcluirOSUseCase,
    private readonly cancelarOS: CancelarOSUseCase,
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.createOS.execute(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getOS.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.listOS.execute({
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        status: req.query.status as StatusOS | undefined,
        clienteId: req.query.clienteId as string | undefined,
        veiculoId: req.query.veiculoId as string | undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async iniciar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.iniciarOS.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async concluir(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.concluirOS.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async cancelar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.cancelarOS.execute({
        id: req.params['id'] as string,
        motivo: req.body.motivo as string,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
