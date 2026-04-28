import { Request, Response, NextFunction } from 'express';
import { ClienteController } from '@presentation/controllers/cliente.controller';

const makeRes = () => {
  const res = { status: jest.fn(), json: jest.fn(), send: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
};

const next = jest.fn() as NextFunction;

const mockCreate = { execute: jest.fn() };
const mockGet = { execute: jest.fn() };
const mockList = { execute: jest.fn() };
const mockUpdate = { execute: jest.fn() };
const mockDeactivate = { execute: jest.fn() };

const ctrl = new ClienteController(
  mockCreate as any, mockGet as any, mockList as any, mockUpdate as any, mockDeactivate as any,
);

beforeEach(() => jest.clearAllMocks());

describe('ClienteController', () => {
  describe('create', () => {
    it('returns 201 with result on success', async () => {
      const dto = { nome: 'João' };
      mockCreate.execute.mockResolvedValue(dto);
      const req = { body: dto } as Request;
      const res = makeRes();

      await ctrl.create(req, res, next);

      expect(mockCreate.execute).toHaveBeenCalledWith(dto);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('calls next(err) on failure', async () => {
      const err = new Error('fail');
      mockCreate.execute.mockRejectedValue(err);
      await ctrl.create({ body: {} } as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getById', () => {
    it('returns 200 with result', async () => {
      const dto = { id: 'c1' };
      mockGet.execute.mockResolvedValue(dto);
      const req = { params: { id: 'c1' } } as unknown as Request;
      const res = makeRes();

      await ctrl.getById(req, res, next);

      expect(mockGet.execute).toHaveBeenCalledWith('c1');
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('calls next(err) on failure', async () => {
      const err = new Error('not found');
      mockGet.execute.mockRejectedValue(err);
      await ctrl.getById({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('list', () => {
    it('returns list with default pagination when no query params', async () => {
      const dto = { clientes: [], total: 0, page: 1, limit: 20 };
      mockList.execute.mockResolvedValue(dto);
      const req = { query: {} } as Request;
      const res = makeRes();

      await ctrl.list(req, res, next);

      expect(mockList.execute).toHaveBeenCalledWith({ page: undefined, limit: undefined });
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('parses page and limit from query', async () => {
      mockList.execute.mockResolvedValue({ clientes: [], total: 0, page: 2, limit: 10 });
      const req = { query: { page: '2', limit: '10' } } as unknown as Request;
      await ctrl.list(req, makeRes(), next);
      expect(mockList.execute).toHaveBeenCalledWith({ page: 2, limit: 10 });
    });

    it('calls next(err) on failure', async () => {
      const err = new Error('fail');
      mockList.execute.mockRejectedValue(err);
      await ctrl.list({ query: {} } as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('update', () => {
    it('returns updated result', async () => {
      const dto = { id: 'c1', nome: 'Novo' };
      mockUpdate.execute.mockResolvedValue(dto);
      const req = { params: { id: 'c1' }, body: { telefone: '11' } } as unknown as Request;
      const res = makeRes();

      await ctrl.update(req, res, next);

      expect(mockUpdate.execute).toHaveBeenCalledWith('c1', { telefone: '11' });
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('calls next(err) on failure', async () => {
      const err = new Error('fail');
      mockUpdate.execute.mockRejectedValue(err);
      await ctrl.update({ params: { id: 'x' }, body: {} } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('deactivate', () => {
    it('returns 204 on success', async () => {
      mockDeactivate.execute.mockResolvedValue(undefined);
      const req = { params: { id: 'c1' } } as unknown as Request;
      const res = makeRes();

      await ctrl.deactivate(req, res, next);

      expect(mockDeactivate.execute).toHaveBeenCalledWith('c1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('calls next(err) on failure', async () => {
      const err = new Error('fail');
      mockDeactivate.execute.mockRejectedValue(err);
      await ctrl.deactivate({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
