import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, authMiddleware } from '@presentation/middlewares/auth.middleware';
import { JwtService } from '@infrastructure/security/jwt.service';

jest.mock('@infrastructure/security/jwt.service');

const MockJwtService = JwtService as jest.MockedClass<typeof JwtService>;

const makeReq = (authHeader?: string): AuthenticatedRequest => ({
  headers: authHeader ? { authorization: authHeader } : {},
} as AuthenticatedRequest);

const res = {} as Response;
const next = jest.fn() as NextFunction;

beforeEach(() => jest.clearAllMocks());

describe('authMiddleware', () => {
  it('calls next() without error when no Authorization header', () => {
    authMiddleware(makeReq(), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() without error when Authorization does not start with Bearer', () => {
    authMiddleware(makeReq('Basic abc'), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('sets userId and userEmail then calls next on valid token', () => {
    MockJwtService.fromEnv = jest.fn().mockReturnValue({
      verify: jest.fn().mockReturnValue({ userId: 'u1', email: 'test@test.com' }),
    });

    const req = makeReq('Bearer valid.token.here');
    authMiddleware(req, res, next);

    expect(req.userId).toBe('u1');
    expect(req.userEmail).toBe('test@test.com');
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) when token verification throws', () => {
    const error = new Error('invalid token');
    MockJwtService.fromEnv = jest.fn().mockReturnValue({
      verify: jest.fn().mockImplementation(() => { throw error; }),
    });

    authMiddleware(makeReq('Bearer bad.token'), res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
