import { Request, Response, NextFunction } from 'express';
import { webhookAuthMiddleware } from '@presentation/middlewares/webhook-auth.middleware';
import { UnauthorizedError } from '@shared/errors/domain.error';

const next = jest.fn() as NextFunction;
const res = {} as Response;
const makeReq = (headers: Record<string, string>) => ({ headers } as unknown as Request);

describe('webhookAuthMiddleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, WEBHOOK_SECRET: 'super-secret' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('calls next() when the secret header matches', () => {
    webhookAuthMiddleware(makeReq({ 'x-webhook-secret': 'super-secret' }), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when the secret header is missing', () => {
    webhookAuthMiddleware(makeReq({}), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next(err) when the secret header does not match', () => {
    webhookAuthMiddleware(makeReq({ 'x-webhook-secret': 'wrong' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('calls next(err) when WEBHOOK_SECRET is not configured', () => {
    delete process.env['WEBHOOK_SECRET'];
    webhookAuthMiddleware(makeReq({ 'x-webhook-secret': 'anything' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
