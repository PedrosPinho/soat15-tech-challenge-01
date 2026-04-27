import { User } from '@domain/entities/user.entity';

describe('User Entity', () => {
  describe('create', () => {
    it('should create user with valid data', () => {
      const user = User.create({ nome: 'Admin', email: 'admin@oficina.com', senhaHash: 'hashedpwd' });
      expect(user.nome).toBe('Admin');
      expect(user.email).toBe('admin@oficina.com');
      expect(user.ativo).toBe(true);
      expect(user.id).toBeDefined();
    });

    it('should throw for invalid email', () => {
      expect(() =>
        User.create({ nome: 'Admin', email: 'not-an-email', senhaHash: 'hash' }),
      ).toThrow('Invalid email format');
    });

    it('should throw for short name', () => {
      expect(() =>
        User.create({ nome: 'A', email: 'admin@oficina.com', senhaHash: 'hash' }),
      ).toThrow('Nome must be at least 3 characters');
    });
  });

  describe('desativar', () => {
    it('should return inactive user', () => {
      const user = User.create({ nome: 'Admin', email: 'admin@oficina.com', senhaHash: 'hash' });
      const inactive = user.desativar();
      expect(inactive.ativo).toBe(false);
    });
  });
});
