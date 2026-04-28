import { Request, Response, NextFunction } from 'express';
import { validateCreatePagamento } from '@presentation/validators/pagamento.validator';

const res = {} as Response;
const next = jest.fn() as NextFunction;
const makeReq = (body: object) => ({ body } as Request);

beforeEach(() => jest.clearAllMocks());

const valid = { ordemServicoId: 'os1', valor: 500, formaPagamento: 'PIX' };

describe('validateCreatePagamento', () => {
  it('calls next() with valid body', () => {
    validateCreatePagamento(makeReq(valid), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when ordemServicoId is empty', () => {
    validateCreatePagamento(makeReq({ ...valid, ordemServicoId: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when valor is 0', () => {
    validateCreatePagamento(makeReq({ ...valid, valor: 0 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when valor is negative', () => {
    validateCreatePagamento(makeReq({ ...valid, valor: -10 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when valor is not a number', () => {
    validateCreatePagamento(makeReq({ ...valid, valor: 'abc' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when formaPagamento is invalid', () => {
    validateCreatePagamento(makeReq({ ...valid, formaPagamento: 'BOLETO' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('accepts all valid formaPagamento values', () => {
    for (const forma of ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA']) {
      jest.clearAllMocks();
      validateCreatePagamento(makeReq({ ...valid, formaPagamento: forma }), res, next);
      expect(next).toHaveBeenCalledWith();
    }
  });
});
