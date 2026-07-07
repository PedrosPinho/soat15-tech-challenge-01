import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '@shared/errors/domain.error';

export const webhookAuthMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const secret = req.headers['x-webhook-secret'];
  const expected = process.env.WEBHOOK_SECRET;

  if (!expected || secret !== expected) {
    return next(new UnauthorizedError('Assinatura de webhook inválida'));
  }
  next();
};
