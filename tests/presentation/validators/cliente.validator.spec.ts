import { Request, Response, NextFunction } from 'express';
import { validateCreateCliente, validateUpdateCliente } from '@presentation/validators/cliente.validator';

const res = {} as Response;
const next = jest.fn() as NextFunction;

const validEndereco = {
  logradouro: 'Rua A',
  numero: '1',
  bairro: 'Centro',
  cidade: 'SP',
  estado: 'SP',
  cep: '01000-000',
};

const validBody = {
  nome: 'João',
  cpfCnpj: '123.456.789-09',
  tipo: 'PESSOA_FISICA',
  telefone: '11999999999',
  email: 'joao@test.com',
  endereco: validEndereco,
};

beforeEach(() => jest.clearAllMocks());

describe('validateCreateCliente', () => {
  const makeReq = (body: object) => ({ body } as Request);

  it('calls next() with valid body', () => {
    validateCreateCliente(makeReq(validBody), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when nome is missing', () => {
    validateCreateCliente(makeReq({ ...validBody, nome: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when tipo is invalid', () => {
    validateCreateCliente(makeReq({ ...validBody, tipo: 'INVALIDO' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when endereco is missing', () => {
    validateCreateCliente(makeReq({ ...validBody, endereco: null }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when endereco.logradouro is missing', () => {
    validateCreateCliente(makeReq({ ...validBody, endereco: { ...validEndereco, logradouro: '' } }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when cpfCnpj is missing', () => {
    validateCreateCliente(makeReq({ ...validBody, cpfCnpj: '   ' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('validateUpdateCliente', () => {
  const makeReq = (body: object) => ({ body } as Request);

  it('calls next() with valid body', () => {
    validateUpdateCliente(makeReq({ telefone: '119', email: 'x@x.com' }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when telefone is missing', () => {
    validateUpdateCliente(makeReq({ telefone: '', email: 'x@x.com' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when email is missing', () => {
    validateUpdateCliente(makeReq({ telefone: '119', email: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
