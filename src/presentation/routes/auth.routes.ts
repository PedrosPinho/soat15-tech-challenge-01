import { Router } from 'express';
import { AuthController } from '@presentation/controllers/auth.controller';

export const authRouter = Router();
const authController = new AuthController();

authRouter.post('/login', (req, res, next) => authController.login(req, res, next));
