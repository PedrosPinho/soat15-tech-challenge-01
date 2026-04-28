import { MongoUserRepository } from '@infrastructure/database/mongodb/repositories/user.repository.impl';
import { User } from '@domain/entities/user.entity';

jest.mock('@infrastructure/database/mongodb/schemas/user.schema', () => ({
  UserModel: {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { UserModel } = require('@infrastructure/database/mongodb/schemas/user.schema') as {
  UserModel: { create: jest.Mock; findOne: jest.Mock; findById: jest.Mock; };
};

const userDoc = {
  _id: 'u-uuid-1', nome: 'Admin User',
  email: 'admin@test.com', senhaHash: 'hashed-password',
  ativo: true, criadoEm: new Date(),
};

function makeUser(): User {
  return User.create({
    id: 'u-uuid-1', nome: 'Admin User',
    email: 'admin@test.com', senhaHash: 'hashed-password',
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  UserModel.create.mockResolvedValue(undefined);
  UserModel.findOne.mockResolvedValue(null);
  UserModel.findById.mockResolvedValue(null);
});

describe('MongoUserRepository', () => {
  const repo = new MongoUserRepository();

  it('save — calls UserModel.create with correct data', async () => {
    await repo.save(makeUser());
    const arg = UserModel.create.mock.calls[0][0] as Record<string, unknown>;
    expect(arg['_id']).toBe('u-uuid-1');
    expect(arg['email']).toBe('admin@test.com');
    expect(arg['senhaHash']).toBe('hashed-password');
  });

  it('findByEmail — returns null when not found', async () => {
    expect(await repo.findByEmail('unknown@test.com')).toBeNull();
    expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'unknown@test.com' });
  });

  it('findByEmail — returns User when found', async () => {
    UserModel.findOne.mockResolvedValue(userDoc);
    const result = await repo.findByEmail('admin@test.com');
    expect(result?.nome).toBe('Admin User');
    expect(result?.ativo).toBe(true);
  });

  it('findById — returns null when not found', async () => {
    expect(await repo.findById('nonexistent')).toBeNull();
  });

  it('findById — returns User when found', async () => {
    UserModel.findById.mockResolvedValue(userDoc);
    const result = await repo.findById('u-uuid-1');
    expect(result?.id).toBe('u-uuid-1');
    expect(result?.senhaHash).toBe('hashed-password');
  });
});
