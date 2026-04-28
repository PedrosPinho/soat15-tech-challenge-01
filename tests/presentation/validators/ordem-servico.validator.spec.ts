import { Request, Response, NextFunction } from 'express';
import { validateCreateOrdemServico, validateCancelarOS } from '@presentation/validators/ordem-servico.validator';

const res = {} as Response;
const next = jest.fn() as NextFunction;
const makeReq = (body: object) => ({ body } as Request);

beforeEach(() => jest.clearAllMocks());

const validCreate = {
  clienteId: 'c1',
  veiculoId: 'v1',
  quilometragemEntrada: 50000,
};

describe('validateCreateOrdemServico', () => {
  it('calls next() with minimal valid body', () => {
    validateCreateOrdemServico(makeReq(validCreate), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() with servicos array', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      servicos: [{ descricao: 'Troca de óleo', tempoEstimadoMinutos: 30, valorMaoDeObra: 100 }],
    }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when clienteId is empty', () => {
    validateCreateOrdemServico(makeReq({ ...validCreate, clienteId: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when veiculoId is empty', () => {
    validateCreateOrdemServico(makeReq({ ...validCreate, veiculoId: '  ' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when quilometragemEntrada is negative', () => {
    validateCreateOrdemServico(makeReq({ ...validCreate, quilometragemEntrada: -1 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when quilometragemEntrada is not a number', () => {
    validateCreateOrdemServico(makeReq({ ...validCreate, quilometragemEntrada: 'abc' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when servicos is not an array', () => {
    validateCreateOrdemServico(makeReq({ ...validCreate, servicos: 'invalid' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when servico has empty descricao', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      servicos: [{ descricao: '', tempoEstimadoMinutos: 30, valorMaoDeObra: 100 }],
    }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when servico has invalid tempoEstimadoMinutos', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      servicos: [{ descricao: 'Desc', tempoEstimadoMinutos: 0, valorMaoDeObra: 100 }],
    }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when servico has negative valorMaoDeObra', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      servicos: [{ descricao: 'Desc', tempoEstimadoMinutos: 30, valorMaoDeObra: -1 }],
    }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('validateCancelarOS', () => {
  it('calls next() with valid motivo', () => {
    validateCancelarOS(makeReq({ motivo: 'Cliente desistiu' }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when motivo is empty', () => {
    validateCancelarOS(makeReq({ motivo: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when motivo is missing', () => {
    validateCancelarOS(makeReq({}), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
