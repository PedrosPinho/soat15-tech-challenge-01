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

    if (req.body.catalogoServicos !== undefined) {
      if (!Array.isArray(req.body.catalogoServicos)) {
        throw new ValidationError('catalogoServicos deve ser um array');
      }
      for (const item of req.body.catalogoServicos as unknown[]) {
        const srv = item as Record<string, unknown>;
        if (typeof srv['catalogoServicoId'] !== 'string' || !(srv['catalogoServicoId'] as string).trim()) {
          throw new ValidationError('Cada item de catalogoServicos deve ter um catalogoServicoId');
        }
        if (srv['pecasUtilizadas'] !== undefined) {
          if (!Array.isArray(srv['pecasUtilizadas'])) {
            throw new ValidationError('pecasUtilizadas deve ser um array');
          }
          for (const p of srv['pecasUtilizadas'] as unknown[]) {
            const peca = p as Record<string, unknown>;
            if (typeof peca['pecaId'] !== 'string' || !(peca['pecaId'] as string).trim()) {
              throw new ValidationError('Cada peça deve ter um pecaId');
            }
            if (typeof peca['quantidade'] !== 'number' || (peca['quantidade'] as number) <= 0) {
              throw new ValidationError('Cada peça deve ter quantidade maior que zero');
            }
          }
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
