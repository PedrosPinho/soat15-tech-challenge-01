import { HashService } from '@infrastructure/security/hash.service';

describe('HashService', () => {
  const service = new HashService(10);

  it('should hash a password', async () => {
    const hash = await service.hash('mypassword');
    expect(hash).not.toBe('mypassword');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('should return true for correct password', async () => {
    const hash = await service.hash('mypassword');
    const result = await service.compare('mypassword', hash);
    expect(result).toBe(true);
  });

  it('should return false for wrong password', async () => {
    const hash = await service.hash('mypassword');
    const result = await service.compare('wrongpassword', hash);
    expect(result).toBe(false);
  });
});
