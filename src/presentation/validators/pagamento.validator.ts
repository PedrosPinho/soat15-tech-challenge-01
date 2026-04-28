import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/errors/domain.error';

const FORMAS = ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA'];

export const validateCreatePagamento = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { ordemServicoId, valor, formaPagamento } = req.body;

    if (typeof ordemServicoId !== 'string' || !ordemServicoId.trim()) {
      throw new ValidationError('ordemServicoId é obrigatório');
    }
    if (typeof valor !== 'number' || valor <= 0) {
      throw new ValidationError('valor deve ser um número maior que zero');
    }
    if (!FORMAS.includes(formaPagamento)) {
      throw new ValidationError(`formaPagamento deve ser um de: ${FORMAS.join(', ')}`);
    }
    next();
  } catch (err) {
    next(err);
  }
};
