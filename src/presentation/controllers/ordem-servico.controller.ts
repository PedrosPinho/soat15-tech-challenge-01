import { Request, Response, NextFunction } from 'express';
import { CreateOrdemServicoUseCase } from '@application/use-cases/ordem-servico/create-ordem-servico.use-case';
import { GetOrdemServicoUseCase } from '@application/use-cases/ordem-servico/get-ordem-servico.use-case';
import { ListOrdensServicoUseCase } from '@application/use-cases/ordem-servico/list-ordens-servico.use-case';
import { EntregarOSUseCase } from '@application/use-cases/ordem-servico/entregar-os.use-case';
import { CancelarOSUseCase } from '@application/use-cases/ordem-servico/cancelar-os.use-case';
import { GetOrdensByCpfCnpjUseCase } from '@application/use-cases/ordem-servico/get-ordens-by-cpfcnpj.use-case';
import { GetHistoricoOSUseCase } from '@application/use-cases/ordem-servico/get-historico-os.use-case';
import { StatusOS } from '@domain/entities/ordem-servico.entity';
import { ValidationError } from '@shared/errors/domain.error';

export class OrdemServicoController {
  constructor(
    private readonly createOS: CreateOrdemServicoUseCase,
    private readonly getOS: GetOrdemServicoUseCase,
    private readonly listOS: ListOrdensServicoUseCase,
    private readonly entregarOS: EntregarOSUseCase,
    private readonly cancelarOS: CancelarOSUseCase,
    private readonly getOrdensByCpfCnpjUseCase: GetOrdensByCpfCnpjUseCase,
    private readonly getHistoricoOS: GetHistoricoOSUseCase,
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

  async entregar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.entregarOS.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOrdensByCpfCnpj(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cpfCnpj = req.query.cpfCnpj as string | undefined;
      if (!cpfCnpj?.trim()) {
        throw new ValidationError('cpfCnpj é obrigatório');
      }
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const result = await this.getOrdensByCpfCnpjUseCase.execute(cpfCnpj.trim(), page, limit);
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
      // 202: a compensação da Saga é assíncrona; CANCELADA chega ao fim dela.
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  }

  async historico(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getHistoricoOS.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
