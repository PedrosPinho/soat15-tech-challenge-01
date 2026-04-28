import { Request, Response, NextFunction } from 'express';
import { PecaController } from '@presentation/controllers/peca.controller';

const makeRes = () => {
  const res = { status: jest.fn(), json: jest.fn(), send: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
};

const next = jest.fn() as NextFunction;
const mockCreate = { execute: jest.fn() };
const mockGet = { execute: jest.fn() };
const mockUpdate = { execute: jest.fn() };
const mockList = { execute: jest.fn() };
const mockDeactivate = { execute: jest.fn() };

const ctrl = new PecaController(
  mockCreate as any, mockGet as any, mockUpdate as any, mockList as any, mockDeactivate as any,
);

beforeEach(() => jest.clearAllMocks());

describe('PecaController', () => {
  describe('create', () => {
    it('returns 201 with result', async () => {
      const dto = { id: 'p1' };
      mockCreate.execute.mockResolvedValue(dto);
      const res = makeRes();
      await ctrl.create({ body: {} } as Request, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('calls next(err) on failure', async () => {
      mockCreate.execute.mockRejectedValue(new Error('fail'));
      await ctrl.create({ body: {} } as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getById', () => {
    it('returns peca', async () => {
      const dto = { id: 'p1' };
      mockGet.execute.mockResolvedValue(dto);
      const res = makeRes();
      await ctrl.getById({ params: { id: 'p1' } } as unknown as Request, res, next);
      expect(mockGet.execute).toHaveBeenCalledWith('p1');
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('calls next(err) on failure', async () => {
      mockGet.execute.mockRejectedValue(new Error('fail'));
      await ctrl.getById({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('update', () => {
    it('returns updated peca', async () => {
      const dto = { id: 'p1', precoVenda: 30 };
      mockUpdate.execute.mockResolvedValue(dto);
      const res = makeRes();
      await ctrl.update({ params: { id: 'p1' }, body: { precoVenda: 30 } } as unknown as Request, res, next);
      expect(mockUpdate.execute).toHaveBeenCalledWith('p1', { precoVenda: 30 });
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('calls next(err) on failure', async () => {
      mockUpdate.execute.mockRejectedValue(new Error('fail'));
      await ctrl.update({ params: { id: 'x' }, body: {} } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('list', () => {
    it('returns list without filters', async () => {
      const dto = { pecas: [], total: 0 };
      mockList.execute.mockResolvedValue(dto);
      const res = makeRes();
      await ctrl.list({ query: {} } as Request, res, next);
      expect(mockList.execute).toHaveBeenCalledWith({
        page: undefined, limit: undefined, categoria: undefined, search: undefined,
      });
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('passes categoria and search from query', async () => {
      mockList.execute.mockResolvedValue({ pecas: [], total: 0 });
      const req = { query: { categoria: 'FILTROS', search: 'oleo', page: '1', limit: '10' } } as unknown as Request;
      await ctrl.list(req, makeRes(), next);
      expect(mockList.execute).toHaveBeenCalledWith({ page: 1, limit: 10, categoria: 'FILTROS', search: 'oleo' });
    });

    it('calls next(err) on failure', async () => {
      mockList.execute.mockRejectedValue(new Error('fail'));
      await ctrl.list({ query: {} } as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('deactivate', () => {
    it('returns 204 on success', async () => {
      mockDeactivate.execute.mockResolvedValue(undefined);
      const res = makeRes();
      await ctrl.deactivate({ params: { id: 'p1' } } as unknown as Request, res, next);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('calls next(err) on failure', async () => {
      mockDeactivate.execute.mockRejectedValue(new Error('fail'));
      await ctrl.deactivate({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
