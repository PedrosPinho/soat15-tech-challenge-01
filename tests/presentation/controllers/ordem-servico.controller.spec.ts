import { Request, Response, NextFunction } from 'express';
import { OrdemServicoController } from '@presentation/controllers/ordem-servico.controller';

const makeRes = () => {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
};

const next = jest.fn() as NextFunction;

const mockCreate = { execute: jest.fn() };
const mockGet = { execute: jest.fn() };
const mockList = { execute: jest.fn() };
const mockIniciar = { execute: jest.fn() };
const mockAguardarAprovacao = { execute: jest.fn() };
const mockAprovar = { execute: jest.fn() };
const mockConcluir = { execute: jest.fn() };
const mockEntregar = { execute: jest.fn() };
const mockCancelar = { execute: jest.fn() };

const ctrl = new OrdemServicoController(
  mockCreate as any, mockGet as any, mockList as any,
  mockIniciar as any, mockAguardarAprovacao as any, mockAprovar as any,
  mockConcluir as any, mockEntregar as any, mockCancelar as any,
);

beforeEach(() => jest.clearAllMocks());

const osDto = { id: 'os1', numeroOS: 'OS-001' };

describe('OrdemServicoController', () => {
  describe('create', () => {
    it('returns 201 with result', async () => {
      mockCreate.execute.mockResolvedValue(osDto);
      const res = makeRes();
      await ctrl.create({ body: { cpfCnpj: 'c1' } } as Request, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(osDto);
    });

    it('calls next(err) on failure', async () => {
      mockCreate.execute.mockRejectedValue(new Error('fail'));
      await ctrl.create({ body: {} } as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getById', () => {
    it('returns OS', async () => {
      mockGet.execute.mockResolvedValue(osDto);
      const res = makeRes();
      await ctrl.getById({ params: { id: 'os1' } } as unknown as Request, res, next);
      expect(mockGet.execute).toHaveBeenCalledWith('os1');
      expect(res.json).toHaveBeenCalledWith(osDto);
    });

    it('calls next(err) on failure', async () => {
      mockGet.execute.mockRejectedValue(new Error('fail'));
      await ctrl.getById({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('list', () => {
    it('returns list with empty query', async () => {
      const listDto = { ordens: [], total: 0, page: 1, limit: 20 };
      mockList.execute.mockResolvedValue(listDto);
      const res = makeRes();
      await ctrl.list({ query: {} } as Request, res, next);
      expect(mockList.execute).toHaveBeenCalledWith({
        page: undefined, limit: undefined, status: undefined, clienteId: undefined, veiculoId: undefined,
      });
      expect(res.json).toHaveBeenCalledWith(listDto);
    });

    it('parses all query params', async () => {
      mockList.execute.mockResolvedValue({ ordens: [], total: 0, page: 1, limit: 10 });
      const req = {
        query: { page: '1', limit: '10', status: 'RECEBIDA', clienteId: 'c1', veiculoId: 'v1' },
      } as unknown as Request;
      await ctrl.list(req, makeRes(), next);
      expect(mockList.execute).toHaveBeenCalledWith({
        page: 1, limit: 10, status: 'RECEBIDA', clienteId: 'c1', veiculoId: 'v1',
      });
    });

    it('calls next(err) on failure', async () => {
      mockList.execute.mockRejectedValue(new Error('fail'));
      await ctrl.list({ query: {} } as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('iniciar', () => {
    it('returns OS with EM_DIAGNOSTICO status', async () => {
      mockIniciar.execute.mockResolvedValue({ ...osDto, status: 'EM_DIAGNOSTICO' });
      const res = makeRes();
      await ctrl.iniciar({ params: { id: 'os1' } } as unknown as Request, res, next);
      expect(mockIniciar.execute).toHaveBeenCalledWith('os1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'EM_DIAGNOSTICO' }));
    });

    it('calls next(err) on failure', async () => {
      mockIniciar.execute.mockRejectedValue(new Error('fail'));
      await ctrl.iniciar({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('aguardarAprovacao', () => {
    it('returns OS with AGUARDANDO_APROVACAO status', async () => {
      mockAguardarAprovacao.execute.mockResolvedValue({ ...osDto, status: 'AGUARDANDO_APROVACAO' });
      const res = makeRes();
      await ctrl.aguardarAprovacao({ params: { id: 'os1' } } as unknown as Request, res, next);
      expect(mockAguardarAprovacao.execute).toHaveBeenCalledWith('os1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'AGUARDANDO_APROVACAO' }));
    });

    it('calls next(err) on failure', async () => {
      mockAguardarAprovacao.execute.mockRejectedValue(new Error('fail'));
      await ctrl.aguardarAprovacao({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('aprovar', () => {
    it('returns OS with EM_EXECUCAO status', async () => {
      mockAprovar.execute.mockResolvedValue({ ...osDto, status: 'EM_EXECUCAO' });
      const res = makeRes();
      await ctrl.aprovar({ params: { id: 'os1' } } as unknown as Request, res, next);
      expect(mockAprovar.execute).toHaveBeenCalledWith('os1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'EM_EXECUCAO' }));
    });

    it('calls next(err) on failure', async () => {
      mockAprovar.execute.mockRejectedValue(new Error('fail'));
      await ctrl.aprovar({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('concluir', () => {
    it('returns OS with FINALIZADA status', async () => {
      mockConcluir.execute.mockResolvedValue({ ...osDto, status: 'FINALIZADA' });
      const res = makeRes();
      await ctrl.concluir({ params: { id: 'os1' } } as unknown as Request, res, next);
      expect(mockConcluir.execute).toHaveBeenCalledWith('os1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'FINALIZADA' }));
    });

    it('calls next(err) on failure', async () => {
      mockConcluir.execute.mockRejectedValue(new Error('fail'));
      await ctrl.concluir({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('entregar', () => {
    it('returns OS with ENTREGUE status', async () => {
      mockEntregar.execute.mockResolvedValue({ ...osDto, status: 'ENTREGUE' });
      const res = makeRes();
      await ctrl.entregar({ params: { id: 'os1' } } as unknown as Request, res, next);
      expect(mockEntregar.execute).toHaveBeenCalledWith('os1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ENTREGUE' }));
    });

    it('calls next(err) on failure', async () => {
      mockEntregar.execute.mockRejectedValue(new Error('fail'));
      await ctrl.entregar({ params: { id: 'x' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('cancelar', () => {
    it('returns canceled OS', async () => {
      mockCancelar.execute.mockResolvedValue({ ...osDto, status: 'CANCELADA' });
      const res = makeRes();
      await ctrl.cancelar({ params: { id: 'os1' }, body: { motivo: 'teste' } } as unknown as Request, res, next);
      expect(mockCancelar.execute).toHaveBeenCalledWith({ id: 'os1', motivo: 'teste' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'CANCELADA' }));
    });

    it('calls next(err) on failure', async () => {
      mockCancelar.execute.mockRejectedValue(new Error('fail'));
      await ctrl.cancelar({ params: { id: 'x' }, body: { motivo: 'm' } } as unknown as Request, makeRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
