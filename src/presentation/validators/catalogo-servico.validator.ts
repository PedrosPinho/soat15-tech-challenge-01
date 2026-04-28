import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/errors/domain.error';

export const validateCreateCatalogoServico = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { descricao, preco, tempoEstimado } = req.body;

    if (typeof descricao !== 'string' || !descricao.trim()) {
      throw new ValidationError('descricao é obrigatória');
    }
    if (typeof preco !== 'number' || preco < 0) {
      throw new ValidationError('preco deve ser um número não negativo');
    }
    if (typeof tempoEstimado !== 'number' || tempoEstimado <= 0) {
      throw new ValidationError('tempoEstimado deve ser um número maior que zero');
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const validateUpdateCatalogoServico = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { descricao, preco, tempoEstimado } = req.body;

    if (descricao !== undefined && (typeof descricao !== 'string' || !descricao.trim())) {
      throw new ValidationError('descricao deve ser uma string não vazia');
    }
    if (preco !== undefined && (typeof preco !== 'number' || preco < 0)) {
      throw new ValidationError('preco deve ser um número não negativo');
    }
    if (tempoEstimado !== undefined && (typeof tempoEstimado !== 'number' || tempoEstimado <= 0)) {
      throw new ValidationError('tempoEstimado deve ser um número maior que zero');
    }
    next();
  } catch (err) {
    next(err);
  }
};
