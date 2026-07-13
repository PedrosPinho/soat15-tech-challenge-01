import { Request, Response, NextFunction } from 'express';
import {
  validateCreateOrdemServico,
  validateCancelarOS,
  validateAprovacaoWebhook,
} from '@presentation/validators/ordem-servico.validator';

const res = {} as Response;
const next = jest.fn() as NextFunction;
const makeReq = (body: object) => ({ body } as Request);

beforeEach(() => jest.clearAllMocks());

const validCreate = {
  cpfCnpj: '52998224725',
  placa: 'ABC1D23',
  quilometragemEntrada: 50000,
};

describe('validateCreateOrdemServico', () => {
  it('calls next() with minimal valid body', () => {
    validateCreateOrdemServico(makeReq(validCreate), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() with catalogoServicos array', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      catalogoServicos: [{ catalogoServicoId: 'abc-123' }],
    }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() with catalogoServicos and pecasUtilizadas', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      catalogoServicos: [{
        catalogoServicoId: 'abc-123',
        pecasUtilizadas: [{ pecaId: 'peca-1', quantidade: 2 }],
      }],
    }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when cpfCnpj is empty', () => {
    validateCreateOrdemServico(makeReq({ ...validCreate, cpfCnpj: '' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when placa is empty', () => {
    validateCreateOrdemServico(makeReq({ ...validCreate, placa: '  ' }), res, next);
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

  it('calls next(err) when catalogoServicos is not an array', () => {
    validateCreateOrdemServico(makeReq({ ...validCreate, catalogoServicos: 'invalid' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when catalogoServicoId is empty', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      catalogoServicos: [{ catalogoServicoId: '' }],
    }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when pecasUtilizadas is not an array', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      catalogoServicos: [{ catalogoServicoId: 'abc', pecasUtilizadas: 'invalid' }],
    }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when peca has empty pecaId', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      catalogoServicos: [{ catalogoServicoId: 'abc', pecasUtilizadas: [{ pecaId: '', quantidade: 1 }] }],
    }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when peca has zero quantidade', () => {
    validateCreateOrdemServico(makeReq({
      ...validCreate,
      catalogoServicos: [{ catalogoServicoId: 'abc', pecasUtilizadas: [{ pecaId: 'p1', quantidade: 0 }] }],
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

describe('validateAprovacaoWebhook', () => {
  it('calls next() when aprovado is true', () => {
    validateAprovacaoWebhook(makeReq({ aprovado: true }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() when aprovado is false with motivo', () => {
    validateAprovacaoWebhook(makeReq({ aprovado: false, motivo: 'Orçamento alto' }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when aprovado is missing', () => {
    validateAprovacaoWebhook(makeReq({}), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when aprovado is not boolean', () => {
    validateAprovacaoWebhook(makeReq({ aprovado: 'sim' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(err) when motivo is not a string', () => {
    validateAprovacaoWebhook(makeReq({ aprovado: false, motivo: 123 }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
