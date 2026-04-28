import { LoginUseCase } from '@application/use-cases/auth/login.use-case';
import { IUserRepository } from '@domain/repositories/user.repository';
import { HashService } from '@infrastructure/security/hash.service';
import { JwtService } from '@infrastructure/security/jwt.service';
import { UnauthorizedError } from '@shared/errors/domain.error';

const makeUser = (overrides: Partial<{ ativo: boolean }> = {}) => ({
  id: 'u1',
  nome: 'Admin',
  email: 'admin@test.com',
  senhaHash: 'hashed',
  ativo: true,
  ...overrides,
});

function makeRepo(user: ReturnType<typeof makeUser> | null): IUserRepository {
  return {
    findByEmail: jest.fn().mockResolvedValue(user),
    findById: jest.fn(),
    save: jest.fn(),
  };
}

const makeHashService = (valid: boolean): HashService => ({
  hash: jest.fn(),
  compare: jest.fn().mockResolvedValue(valid),
} as unknown as HashService);

const makeJwtService = (): JwtService => ({
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
} as unknown as JwtService);

describe('LoginUseCase', () => {
  it('returns token and user info on valid credentials', async () => {
    const user = makeUser();
    const useCase = new LoginUseCase(makeRepo(user), makeHashService(true), makeJwtService());
    const result = await useCase.execute({ email: user.email, senha: 'correct' });

    expect(result.token).toBe('signed-token');
    expect(result.userId).toBe('u1');
    expect(result.nome).toBe('Admin');
    expect(result.email).toBe('admin@test.com');
  });

  it('throws UnauthorizedError when user not found', async () => {
    const useCase = new LoginUseCase(makeRepo(null), makeHashService(true), makeJwtService());
    await expect(useCase.execute({ email: 'x@x.com', senha: 'p' })).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when user is inactive', async () => {
    const user = makeUser({ ativo: false });
    const useCase = new LoginUseCase(makeRepo(user), makeHashService(true), makeJwtService());
    await expect(useCase.execute({ email: user.email, senha: 'p' })).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError when password is wrong', async () => {
    const user = makeUser();
    const useCase = new LoginUseCase(makeRepo(user), makeHashService(false), makeJwtService());
    await expect(useCase.execute({ email: user.email, senha: 'wrong' })).rejects.toThrow(UnauthorizedError);
  });
});
