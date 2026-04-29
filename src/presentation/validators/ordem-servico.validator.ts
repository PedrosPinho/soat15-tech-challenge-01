import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/errors/domain.error';

export const validateCreateOrdemServico = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const { cpfCnpj, placa, quilometragemEntrada } = req.body;

    if (typeof cpfCnpj !== 'string' || !cpfCnpj.trim()) {
      throw new ValidationError('cpfCnpj é obrigatório');
    }
    if (typeof placa !== 'string' || !placa.trim()) {
      throw new ValidationError('placa é obrigatória');
    }
    if (typeof quilometragemEntrada !== 'number' || quilometragemEntrada < 0) {
      throw new ValidationError('quilometragemEntrada deve ser um número não negativo');
    }

    if (req.body.servicos !== undefined) {
      if (!Array.isArray(req.body.servicos)) {
        throw new ValidationError('servicos deve ser um array');
      }
      for (const s of req.body.servicos as unknown[]) {
        const srv = s as Record<string, unknown>;
        if (typeof srv['descricao'] !== 'string' || !(srv['descricao'] as string).trim()) {
          throw new ValidationError('Cada serviço deve ter uma descricao');
        }
        if (
          typeof srv['tempoEstimadoMinutos'] !== 'number' ||
          (srv['tempoEstimadoMinutos'] as number) <= 0
        ) {
          throw new ValidationError('Cada serviço deve ter tempoEstimadoMinutos maior que zero');
        }
        if (typeof srv['valorMaoDeObra'] !== 'number' || (srv['valorMaoDeObra'] as number) < 0) {
          throw new ValidationError('Cada serviço deve ter valorMaoDeObra não negativo');
        }
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const validateCancelarOS = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (typeof req.body.motivo !== 'string' || !req.body.motivo.trim()) {
      throw new ValidationError('motivo é obrigatório');
    }
    next();
  } catch (err) {
    next(err);
  }
};
