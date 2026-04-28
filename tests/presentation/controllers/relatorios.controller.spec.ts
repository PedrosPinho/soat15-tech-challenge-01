import { Request, Response, NextFunction } from 'express';
import { RelatoriosController } from '@presentation/controllers/relatorios.controller';

const makeRes = () => {
  const res = { json: jest.fn() } as unknown as Response;
  return res;
};

const next = jest.fn() as NextFunction;
const mockDashboard = { execute: jest.fn() };

const ctrl = new RelatoriosController(mockDashboard as any);

beforeEach(() => jest.clearAllMocks());

describe('RelatoriosController', () => {
  describe('getDashboard', () => {
    it('returns dashboard data', async () => {
      const dto = { ordensServico: { total: 5 }, financeiro: { receitaTotal: 1000 }, estoque: { itensAbaixoDoMinimo: 2 } };
      mockDashboard.execute.mockResolvedValue(dto);
      const res = makeRes();
      await ctrl.getDashboard({} as Request, res, next);
      expect(res.json).toHaveBeenCalledWith(dto);
    });

    it('calls next(err) on failure', async () => {
      mockDashboard.execute.mockRejectedValue(new Error('fail'));
      await ctrl.getDashboard({} as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
