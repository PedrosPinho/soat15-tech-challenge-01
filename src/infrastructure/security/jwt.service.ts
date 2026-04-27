import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '@shared/errors/domain.error';

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export class JwtService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn } as jwt.SignOptions);
  }

  verify(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.secret) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  static fromEnv(): JwtService {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not defined');
    return new JwtService(secret, process.env.JWT_EXPIRES_IN ?? '1d');
  }
}
