import { Request, Response, NextFunction } from 'express';
import { validateCreatePeca, validateUpdatePeca } from '@presentation/validators/peca.validator';

const res = {} as Response;
const next = jest.fn() as NextFunction;
const makeReq = (body: object) => ({ body } as Request);

beforeEach(() => jest.clearAllMocks());

const validCreate = {
  codigo: 'P001',
  descricao: 'Filtro de óleo',
  categoria: 'FILTROS',
  precoCompra: 10,
  precoVenda: 20,
  unidadeMedida: 'UNIDADE',
  nivelMinimo: 2,
  nivelMaximo: 100,
};

describe('validateCreatePeca', () => {
  it('calls next() with valid body', () => {
    validateCreatePeca(makeReq(validCreate), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when codigo is empty', () => {
    validateCreatePeca(makeReq({ ...validCreate, codigo: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when descricao is empty', () => {
    validateCreatePeca(makeReq({ ...validCreate, descricao: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when categoria is invalid', () => {
    validateCreatePeca(makeReq({ ...validCreate, categoria: 'INVALIDA' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when precoCompra is not a number', () => {
    validateCreatePeca(makeReq({ ...validCreate, precoCompra: 'abc' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when precoVenda is not a number', () => {
    validateCreatePeca(makeReq({ ...validCreate, precoVenda: null }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when unidadeMedida is invalid', () => {
    validateCreatePeca(makeReq({ ...validCreate, unidadeMedida: 'CAIXA' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when nivelMinimo is float', () => {
    validateCreatePeca(makeReq({ ...validCreate, nivelMinimo: 2.5 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when nivelMaximo is float', () => {
    validateCreatePeca(makeReq({ ...validCreate, nivelMaximo: 10.1 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('validateUpdatePeca', () => {
  it('calls next() with valid prices', () => {
    validateUpdatePeca(makeReq({ precoCompra: 5, precoVenda: 10 }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when precoCompra is not a number', () => {
    validateUpdatePeca(makeReq({ precoCompra: 'x', precoVenda: 10 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when precoVenda is not a number', () => {
    validateUpdatePeca(makeReq({ precoCompra: 5, precoVenda: NaN }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
