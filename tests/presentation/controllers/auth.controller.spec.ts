import { Request, Response, NextFunction } from 'express';
import { AuthController } from '@presentation/controllers/auth.controller';
import { LoginUseCase } from '@application/use-cases/auth/login.use-case';
import { MongoUserRepository } from '@infrastructure/database/mongodb/repositories/user.repository.impl';
import { HashService } from '@infrastructure/security/hash.service';
import { JwtService } from '@infrastructure/security/jwt.service';

jest.mock('@application/use-cases/auth/login.use-case');
jest.mock('@infrastructure/database/mongodb/repositories/user.repository.impl');
jest.mock('@infrastructure/security/hash.service');
jest.mock('@infrastructure/security/jwt.service');

const MockLoginUseCase = LoginUseCase as jest.MockedClass<typeof LoginUseCase>;
const MockMongoUserRepository = MongoUserRepository as jest.MockedClass<typeof MongoUserRepository>;
const MockHashService = HashService as jest.MockedClass<typeof HashService>;
const MockJwtService = JwtService as jest.MockedClass<typeof JwtService>;

const makeRes = () => {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
};

const next = jest.fn() as NextFunction;

beforeEach(() => {
  jest.clearAllMocks();
  MockMongoUserRepository.mockImplementation(() => ({} as any));
  MockHashService.fromEnv = jest.fn().mockReturnValue({} as any);
  MockJwtService.fromEnv = jest.fn().mockReturnValue({} as any);
});

describe('AuthController', () => {
  describe('login', () => {
    it('returns 200 with token on success', async () => {
      const loginResult = { token: 'jwt-token', userId: 'u1', nome: 'Test', email: 'test@test.com' };
      MockLoginUseCase.prototype.execute = jest.fn().mockResolvedValue(loginResult);

      const ctrl = new AuthController();
      const res = makeRes();
      await ctrl.login({ body: { email: 'test@test.com', senha: '123456' } } as Request, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(loginResult);
    });

    it('calls next(err) on failure', async () => {
      const err = new Error('invalid credentials');
      MockLoginUseCase.prototype.execute = jest.fn().mockRejectedValue(err);

      const ctrl = new AuthController();
      await ctrl.login({ body: { email: 'bad@test.com', senha: 'wrong' } } as Request, makeRes(), next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
