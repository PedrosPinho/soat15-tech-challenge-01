import { Request, Response, NextFunction } from 'express';
import { CreateVeiculoUseCase } from '@application/use-cases/veiculo/create-veiculo.use-case';
import { GetVeiculoUseCase } from '@application/use-cases/veiculo/get-veiculo.use-case';
import { UpdateVeiculoUseCase } from '@application/use-cases/veiculo/update-veiculo.use-case';
import { ListVeiculosByClienteUseCase } from '@application/use-cases/veiculo/list-veiculos-by-cliente.use-case';

export class VeiculoController {
  constructor(
    private readonly createVeiculo: CreateVeiculoUseCase,
    private readonly getVeiculo: GetVeiculoUseCase,
    private readonly updateVeiculo: UpdateVeiculoUseCase,
    private readonly listVeiculosByCliente: ListVeiculosByClienteUseCase,
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.createVeiculo.execute(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getVeiculo.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.updateVeiculo.execute(req.params['id'] as string, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async listByCliente(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clienteId = req.params['clienteId'] as string;
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const result = await this.listVeiculosByCliente.execute({ clienteId, page, limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
