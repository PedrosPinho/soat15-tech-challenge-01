import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/errors/domain.error';

const CATEGORIAS = ['MOTOR', 'TRANSMISSAO', 'SUSPENSAO', 'FREIOS', 'ELETRICA', 'FLUIDOS', 'FILTROS', 'OUTROS'];
const UNIDADES = ['UNIDADE', 'LITRO', 'METRO', 'KG'];

function assertString(value: unknown, field: string): void {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} é obrigatório`);
  }
}

function assertNumber(value: unknown, field: string): void {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${field} deve ser um número`);
  }
}

function assertInteger(value: unknown, field: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError(`${field} deve ser um número inteiro`);
  }
}

export const validateCreatePeca = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { codigo, descricao, categoria, precoCompra, precoVenda, unidadeMedida, nivelMinimo, nivelMaximo } = req.body;

    assertString(codigo, 'codigo');
    assertString(descricao, 'descricao');

    if (!CATEGORIAS.includes(categoria)) {
      throw new ValidationError(`categoria deve ser um dos valores: ${CATEGORIAS.join(', ')}`);
    }

    assertNumber(precoCompra, 'precoCompra');
    assertNumber(precoVenda, 'precoVenda');

    if (!UNIDADES.includes(unidadeMedida)) {
      throw new ValidationError(`unidadeMedida deve ser um dos valores: ${UNIDADES.join(', ')}`);
    }

    assertInteger(nivelMinimo, 'nivelMinimo');
    assertInteger(nivelMaximo, 'nivelMaximo');

    next();
  } catch (err) {
    next(err);
  }
};

export const validateUpdatePeca = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    assertNumber(req.body.precoCompra, 'precoCompra');
    assertNumber(req.body.precoVenda, 'precoVenda');
    next();
  } catch (err) {
    next(err);
  }
};
