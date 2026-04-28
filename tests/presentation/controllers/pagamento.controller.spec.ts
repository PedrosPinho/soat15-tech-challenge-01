import { Request, Response, NextFunction } from 'express';
import { PagamentoController } from '@presentation/controllers/pagamento.controller';

const makeRes = () => {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
};

const next = jest.fn() as NextFunction;
const mockCreate = { execute: jest.fn() };
const mockGet = { execute: jest.fn() };
const mockList = { execute: jest.fn() };

const ctrl = new PagamentoController(mockCreate as any, mockGet as any, mockList as any);

beforeEach(() => jest.clearAllMocks());

const pagDto = { id: 'pg1', valor: 500 };

describe('PagamentoController', () => {
  describe('create', () => {
    it('returns 201 with result', async () => {
      mockCreate.execute.mockResolvedValue(pagDto);
      const res = makeRes();
      await ctrl.create({ body: { ordemServicoId: 'os1', valor: 500, formaPagamento: 'PIX' } } as Request, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(pagDto);
    });

    it('calls next(err) on failure', async () => {
      mockCreate.execute.mockRejectedValue(new Error('fail'));
      await ctrl.create({ body: {} } as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getById', () => {
    it('returns pagamento', async () => {
      mockGet.execute.mockResolvedValue(pagDto);
      const res = makeRes();
      await ctrl.getById({ params: { id: 'pg1' } } as unknown as Request, res, next);
      expect(mockGet.execute).toHaveBeenCalledWith('pg1');
      expect(res.json).toHaveBeenCalledWith(pagDto);
    });

    it('calls next(err) on failure', async () => {
      mockGet.execute.mockRejectedValue(new Error('fail'));
      await ctrl.getById({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('list', () => {
    it('returns list without filters', async () => {
      const listDto = { pagamentos: [], total: 0, page: 1, limit: 20 };
      mockList.execute.mockResolvedValue(listDto);
      const res = makeRes();
      await ctrl.list({ query: {} } as Request, res, next);
      expect(mockList.execute).toHaveBeenCalledWith({
        page: undefined, limit: undefined, ordemServicoId: undefined, status: undefined,
      });
      expect(res.json).toHaveBeenCalledWith(listDto);
    });

    it('passes all query params', async () => {
      mockList.execute.mockResolvedValue({ pagamentos: [], total: 0, page: 1, limit: 10 });
      const req = {
        query: { page: '1', limit: '10', ordemServicoId: 'os1', status: 'CONFIRMADO' },
      } as unknown as Request;
      await ctrl.list(req, makeRes(), next);
      expect(mockList.execute).toHaveBeenCalledWith({
        page: 1, limit: 10, ordemServicoId: 'os1', status: 'CONFIRMADO',
      });
    });

    it('calls next(err) on failure', async () => {
      mockList.execute.mockRejectedValue(new Error('fail'));
      await ctrl.list({ query: {} } as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
