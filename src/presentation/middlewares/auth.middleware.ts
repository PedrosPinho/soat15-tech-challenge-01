import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@infrastructure/security/jwt.service';
import { UnauthorizedError } from '@shared/errors/domain.error';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwtService = JwtService.fromEnv();
    const payload = jwtService.verify(token);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (err) {
    next(err);
  }
};
