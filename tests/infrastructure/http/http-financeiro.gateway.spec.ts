import { HttpFinanceiroGateway } from '@infrastructure/http/http-financeiro.gateway';

const ok = (body: unknown, status = 200) =>
  jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe('HttpFinanceiroGateway', () => {
  const base = { baseUrl: 'http://billing/', internalToken: 'tok' };

  it('lê receitaTotal do Billing enviando o token interno', async () => {
    const fetchImpl = ok({ receitaTotal: 1234.5 });
    const total = await new HttpFinanceiroGateway({ ...base, fetchImpl }).receitaTotal();
    expect(total).toBe(1234.5);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://billing/internal/financeiro/resumo',
      expect.objectContaining({ headers: { 'x-internal-token': 'tok' } }),
    );
  });

  it.each([
    ['Billing responde 500', ok({}, 500)],
    ['corpo sem receitaTotal numérica', ok({ receitaTotal: 'x' })],
    ['timeout/rede', jest.fn().mockRejectedValue(new Error('timeout'))],
  ])('fallback null: %s', async (_nome, fetchImpl) => {
    expect(await new HttpFinanceiroGateway({ ...base, fetchImpl }).receitaTotal()).toBeNull();
  });

  it('sem BILLING_SERVICE_URL devolve null sem chamar a rede', async () => {
    const fetchImpl = jest.fn();
    delete process.env.BILLING_SERVICE_URL;
    expect(await new HttpFinanceiroGateway({ fetchImpl }).receitaTotal()).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('usa um AbortSignal com timeout', async () => {
    const fetchImpl = ok({ receitaTotal: 1 });
    await new HttpFinanceiroGateway({ ...base, timeoutMs: 50, fetchImpl }).receitaTotal();
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
