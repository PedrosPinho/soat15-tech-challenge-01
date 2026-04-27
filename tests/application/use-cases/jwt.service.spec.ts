import { JwtService } from '@infrastructure/security/jwt.service';

describe('JwtService', () => {
  const secret = 'test-secret-key';
  const service = new JwtService(secret, '1h');

  it('should sign and verify a token', () => {
    const payload = { userId: 'abc-123', email: 'test@test.com' };
    const token = service.sign(payload);
    const decoded = service.verify(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('should throw for invalid token', () => {
    expect(() => service.verify('invalid.token.here')).toThrow();
  });

  it('should throw for tampered token', () => {
    const token = service.sign({ userId: '1', email: 't@t.com' });
    expect(() => service.verify(token + 'tampered')).toThrow();
  });
});
