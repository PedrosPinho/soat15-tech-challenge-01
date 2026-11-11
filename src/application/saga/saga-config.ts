const UNITS: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Converte "30s", "5m", "2h", "1d" ou um número (ms) em milissegundos. */
export const parseDuration = (value: string | undefined, fallbackMs: number): number => {
  if (!value) return fallbackMs;
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) return fallbackMs;
  return Number(match[1]) * UNITS[match[2] ?? 'ms'];
};

export interface SagaConfig {
  timeoutAprovacaoMs: number;
  timeoutPagamentoMs: number;
  timeoutCompensacaoMs: number;
  maxTentativasCompensacao: number;
  validadeOrcamentoMs: number;
}

export const sagaConfigFromEnv = (env: NodeJS.ProcessEnv = process.env): SagaConfig => ({
  timeoutAprovacaoMs: parseDuration(env.SAGA_TIMEOUT_APROVACAO, 3 * UNITS.d),
  timeoutPagamentoMs: parseDuration(env.SAGA_TIMEOUT_PAGAMENTO, 1 * UNITS.h),
  timeoutCompensacaoMs: parseDuration(env.SAGA_TIMEOUT_COMPENSACAO, 2 * UNITS.m),
  maxTentativasCompensacao: Number(env.SAGA_MAX_TENTATIVAS_COMPENSACAO ?? 3),
  validadeOrcamentoMs: parseDuration(env.ORCAMENTO_VALIDADE, 7 * UNITS.d),
});
