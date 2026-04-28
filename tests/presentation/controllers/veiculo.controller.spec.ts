import { Request, Response, NextFunction } from 'express';
import { VeiculoController } from '@presentation/controllers/veiculo.controller';

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

const ctrl = new VeiculoController(mockCreate as any, mockGet as any, mockUpdate as any, mockList as any);

beforeEach(() => jest.clearAllMocks());

describe('VeiculoController', () => {
  describe('create', () => {
    it('returns 201 with result', async () => {
      const dto = { id: 'v1' };
      mockCreate.execute.mockResolvedValue(dto);
      const res = makeRes();
      await ctrl.create({ body: { placa: 'ABC1234' } } as Request, res, next);
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
    it('returns veiculo', async () => {
      const dto = { id: 'v1' };
      mockGet.execute.mockResolvedValue(dto);
      const res = makeRes();
      await ctrl.getById({ params: { id: 'v1' } } as unknown as Request, res, next);
      expect(mockGet.execute).toHaveBeenCalledWith('v1');
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('calls next(err) on failure', async () => {
      mockGet.execute.mockRejectedValue(new Error('fail'));
      await ctrl.getById({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('update', () => {
    it('returns updated veiculo', async () => {
      const dto = { id: 'v1', quilometragem: 60000 };
      mockUpdate.execute.mockResolvedValue(dto);
      const res = makeRes();
      await ctrl.update({ params: { id: 'v1' }, body: { quilometragem: 60000 } } as unknown as Request, res, next);
      expect(mockUpdate.execute).toHaveBeenCalledWith('v1', { quilometragem: 60000 });
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('calls next(err) on failure', async () => {
      mockUpdate.execute.mockRejectedValue(new Error('fail'));
      await ctrl.update({ params: { id: 'x' }, body: {} } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('listByCliente', () => {
    it('returns list', async () => {
      const dto = { veiculos: [], total: 0 };
      mockList.execute.mockResolvedValue(dto);
      const res = makeRes();
      await ctrl.listByCliente({ params: { clienteId: 'c1' }, query: {} } as unknown as Request, res, next);
      expect(mockList.execute).toHaveBeenCalledWith({ clienteId: 'c1', page: undefined, limit: undefined });
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('parses page and limit from query', async () => {
      mockList.execute.mockResolvedValue({ veiculos: [], total: 0 });
      const req = { params: { clienteId: 'c1' }, query: { page: '2', limit: '5' } } as unknown as Request;
      await ctrl.listByCliente(req, makeRes(), next);
      expect(mockList.execute).toHaveBeenCalledWith({ clienteId: 'c1', page: 2, limit: 5 });
    });

    it('calls next(err) on failure', async () => {
      mockList.execute.mockRejectedValue(new Error('fail'));
      await ctrl.listByCliente({ params: { clienteId: 'x' }, query: {} } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
