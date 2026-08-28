import { Request, Response } from 'express';
import { getPool } from '@infrastructure/database/postgres/pool';

export class HealthController {
  /** Processo vivo — nunca toca o banco. Reiniciar o pod não resolve um problema de banco. */
  live(_req: Request, res: Response): void {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  /** Banco alcançável — usado pela readinessProbe para tirar o pod do Service até a conexão voltar. */
  async ready(_req: Request, res: Response): Promise<void> {
    const database = await this.checkDatabase();
    const statusCode = database === 'CONNECTED' ? 200 : 503;
    res.status(statusCode).json({
      status: database === 'CONNECTED' ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database,
    });
  }

  private async checkDatabase(): Promise<'CONNECTED' | 'DISCONNECTED'> {
    try {
      await getPool().query('SELECT 1');
      return 'CONNECTED';
    } catch {
      return 'DISCONNECTED';
    }
  }
}
