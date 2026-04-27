import { Request, Response, NextFunction } from 'express';
import { CreateClienteUseCase } from '@application/use-cases/cliente/create-cliente.use-case';
import { GetClienteUseCase } from '@application/use-cases/cliente/get-cliente.use-case';
import { ListClientesUseCase } from '@application/use-cases/cliente/list-clientes.use-case';
import { UpdateClienteUseCase } from '@application/use-cases/cliente/update-cliente.use-case';
import { DeactivateClienteUseCase } from '@application/use-cases/cliente/deactivate-cliente.use-case';

export class ClienteController {
  constructor(
    private readonly createCliente: CreateClienteUseCase,
    private readonly getCliente: GetClienteUseCase,
    private readonly listClientes: ListClientesUseCase,
    private readonly updateCliente: UpdateClienteUseCase,
    private readonly deactivateCliente: DeactivateClienteUseCase,
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.createCliente.execute(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.getCliente.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const result = await this.listClientes.execute({ page, limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.updateCliente.execute(req.params['id'] as string, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.deactivateCliente.execute(req.params['id'] as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
