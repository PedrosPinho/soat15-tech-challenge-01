import { Request, Response, NextFunction } from 'express';
import { validateCreateVeiculo, validateUpdateVeiculo } from '@presentation/validators/veiculo.validator';

const res = {} as Response;
const next = jest.fn() as NextFunction;
const makeReq = (body: object) => ({ body } as Request);

beforeEach(() => jest.clearAllMocks());

describe('validateCreateVeiculo', () => {
  const valid = { clienteId: 'c1', placa: 'ABC1234', marca: 'VW', modelo: 'Gol', ano: 2020 };

  it('calls next() with valid body', () => {
    validateCreateVeiculo(makeReq(valid), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when clienteId is empty', () => {
    validateCreateVeiculo(makeReq({ ...valid, clienteId: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when placa is empty', () => {
    validateCreateVeiculo(makeReq({ ...valid, placa: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when ano is not an integer', () => {
    validateCreateVeiculo(makeReq({ ...valid, ano: 2020.5 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when marca is missing', () => {
    validateCreateVeiculo(makeReq({ ...valid, marca: '   ' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('validateUpdateVeiculo', () => {
  it('calls next() with valid quilometragem', () => {
    validateUpdateVeiculo(makeReq({ quilometragem: 50000 }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() with quilometragem 0', () => {
    validateUpdateVeiculo(makeReq({ quilometragem: 0 }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when quilometragem is negative', () => {
    validateUpdateVeiculo(makeReq({ quilometragem: -1 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when quilometragem is a float', () => {
    validateUpdateVeiculo(makeReq({ quilometragem: 1.5 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when quilometragem is missing', () => {
    validateUpdateVeiculo(makeReq({}), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
