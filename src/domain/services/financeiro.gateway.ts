/** Consulta financeira ao Billing Service (dono dos pagamentos). */
export interface IFinanceiroGateway {
  /** Soma dos pagamentos confirmados; `null` se o Billing estiver indisponível. */
  receitaTotal(): Promise<number | null>;
}
