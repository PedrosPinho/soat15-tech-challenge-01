import { Request, Response, NextFunction } from 'express';
import { LoginUseCase } from '@application/use-cases/auth/login.use-case';
import { PostgresUserRepository } from '@infrastructure/database/postgres/repositories/user.repository.impl';
import { HashService } from '@infrastructure/security/hash.service';
import { JwtService } from '@infrastructure/security/jwt.service';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const useCase = new LoginUseCase(
        new PostgresUserRepository(),
        HashService.fromEnv(),
        JwtService.fromEnv(),
      );
      const result = await useCase.execute(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
