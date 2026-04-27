import { Request, Response } from 'express';
import mongoose from 'mongoose';

export class HealthController {
  async check(_req: Request, res: Response): Promise<void> {
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      mongodb: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    };

    const statusCode = health.mongodb === 'CONNECTED' ? 200 : 503;
    res.status(statusCode).json(health);
  }
}
