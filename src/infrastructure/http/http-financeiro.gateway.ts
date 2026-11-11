import { IFinanceiroGateway } from '@domain/services/financeiro.gateway';
import { logger } from '@shared/logger';

export interface HttpFinanceiroGatewayOptions {
  baseUrl?: string;
  internalToken?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * `GET <billing>/internal/financeiro/resumo` com timeout curto. O dashboard não
 * pode cair junto com o Billing: qualquer falha vira `null` + log de warning.
 */
export class HttpFinanceiroGateway implements IFinanceiroGateway {
  private readonly baseUrl?: string;
  private readonly internalToken?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpFinanceiroGatewayOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.BILLING_SERVICE_URL;
    this.internalToken = options.internalToken ?? process.env.INTERNAL_API_TOKEN;
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async receitaTotal(): Promise<number | null> {
    if (!this.baseUrl) {
      logger.warn('BILLING_SERVICE_URL não configurada: receitaTotal indisponível');
      return null;
    }
    try {
      const response = await this.fetchImpl(
        `${this.baseUrl.replace(/\/$/, '')}/internal/financeiro/resumo`,
        {
          headers: { 'x-internal-token': this.internalToken ?? '' },
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      );
      if (!response.ok) {
        logger.warn(
          { status: response.status },
          'Billing respondeu erro ao consultar resumo financeiro',
        );
        return null;
      }
      const body = (await response.json()) as { receitaTotal?: unknown };
      return typeof body.receitaTotal === 'number' ? body.receitaTotal : null;
    } catch (error) {
      logger.warn({ error }, 'Billing indisponível ao consultar resumo financeiro');
      return null;
    }
  }
}
