import { Request, Response, NextFunction } from 'express';
import { CreateOrdemServicoUseCase } from '@application/use-cases/ordem-servico/create-ordem-servico.use-case';
import { GetOrdemServicoUseCase } from '@application/use-cases/ordem-servico/get-ordem-servico.use-case';
import { ListOrdensServicoUseCase } from '@application/use-cases/ordem-servico/list-ordens-servico.use-case';
import { IniciarOSUseCase } from '@application/use-cases/ordem-servico/iniciar-os.use-case';
import { AguardarAprovacaoOSUseCase } from '@application/use-cases/ordem-servico/aguardar-aprovacao-os.use-case';
import { AprovarOSUseCase } from '@application/use-cases/ordem-servico/aprovar-os.use-case';
import { ConcluirOSUseCase } from '@application/use-cases/ordem-servico/concluir-os.use-case';
import { EntregarOSUseCase } from '@application/use-cases/ordem-servico/entregar-os.use-case';
import { CancelarOSUseCase } from '@application/use-cases/ordem-servico/cancelar-os.use-case';
import { GetOrdensByCpfCnpjUseCase } from '@application/use-cases/ordem-servico/get-ordens-by-cpfcnpj.use-case';
import { ProcessarAprovacaoOrcamentoUseCase } from '@application/use-cases/ordem-servico/processar-aprovacao-orcamento.use-case';
import { StatusOS } from '@domain/entities/ordem-servico.entity';
import { ValidationError } from '@shared/errors/domain.error';

export class OrdemServicoController {
  constructor(
    private readonly createOS: CreateOrdemServicoUseCase,
    private readonly getOS: GetOrdemServicoUseCase,
    private readonly listOS: ListOrdensServicoUseCase,
    private readonly iniciarOS: IniciarOSUseCase,
    private readonly aguardarAprovacaoOS: AguardarAprovacaoOSUseCase,
    private readonly aprovarOS: AprovarOSUseCase,
    private readonly concluirOS: ConcluirOSUseCase,
    private readonly entregarOS: EntregarOSUseCase,
    private readonly cancelarOS: CancelarOSUseCase,
    private readonly getOrdensByCpfCnpjUseCase: GetOrdensByCpfCnpjUseCase,
    private readonly processarAprovacaoOrcamentoUseCase: ProcessarAprovacaoOrcamentoUseCase,
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

  async aguardarAprovacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.aguardarAprovacaoOS.execute(req.params['id'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async aprovar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.aprovarOS.execute(req.params['id'] as string);
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
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async processarAprovacaoOrcamento(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await this.processarAprovacaoOrcamentoUseCase.execute(
        req.params['id'] as string,
        {
          aprovado: req.body.aprovado as boolean,
          motivo: req.body.motivo as string | undefined,
        },
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
