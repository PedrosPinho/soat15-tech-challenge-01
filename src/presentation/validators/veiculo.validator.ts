import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/errors/domain.error';

function assertString(value: unknown, field: string): void {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} é obrigatório e deve ser uma string não vazia`);
  }
}

function assertPositiveInt(value: unknown, field: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} deve ser um número inteiro não-negativo`);
  }
}

export const validateCreateVeiculo = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const { clienteId, placa, marca, modelo, ano } = req.body;
    assertString(clienteId, 'clienteId');
    assertString(placa, 'placa');
    assertString(marca, 'marca');
    assertString(modelo, 'modelo');
    if (typeof ano !== 'number' || !Number.isInteger(ano)) {
      throw new ValidationError('ano deve ser um número inteiro');
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const validateUpdateVeiculo = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    assertPositiveInt(req.body.quilometragem, 'quilometragem');
    next();
  } catch (err) {
    next(err);
  }
};
