import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/errors/domain.error';

function assertString(value: unknown, field: string): void {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} é obrigatório e deve ser uma string não vazia`);
  }
}

function assertEnum<T extends string>(value: unknown, field: string, allowed: T[]): void {
  if (!allowed.includes(value as T)) {
    throw new ValidationError(`${field} deve ser um dos valores: ${allowed.join(', ')}`);
  }
}

export const validateCreateCliente = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { nome, cpfCnpj, tipo, telefone, email, endereco } = req.body;

    assertString(nome, 'nome');
    assertString(cpfCnpj, 'cpfCnpj');
    assertEnum(tipo, 'tipo', ['PESSOA_FISICA', 'PESSOA_JURIDICA']);
    assertString(telefone, 'telefone');
    assertString(email, 'email');

    if (!endereco || typeof endereco !== 'object') {
      throw new ValidationError('endereco é obrigatório');
    }
    assertString(endereco.logradouro, 'endereco.logradouro');
    assertString(endereco.numero, 'endereco.numero');
    assertString(endereco.bairro, 'endereco.bairro');
    assertString(endereco.cidade, 'endereco.cidade');
    assertString(endereco.estado, 'endereco.estado');
    assertString(endereco.cep, 'endereco.cep');

    next();
  } catch (err) {
    next(err);
  }
};

export const validateUpdateCliente = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const { telefone, email } = req.body;
    assertString(telefone, 'telefone');
    assertString(email, 'email');
    next();
  } catch (err) {
    next(err);
  }
};
