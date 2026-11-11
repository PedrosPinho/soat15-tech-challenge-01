import { createSagaTimeoutSweeper, startSagaReplyConsumer } from '@application/saga/saga-workers';
import { sagaConfigFromEnv, parseDuration } from '@application/saga/saga-config';
import { InMemoryMessageBus } from '@infrastructure/messaging/in-memory-message-bus';
import { createEnvelope } from '@shared/messaging/envelope';
import { makeHarness, OS_ID } from './saga-harness';

describe('saga workers', () => {
  it('o consumidor de os-saga-replies entrega ao orquestrador (e dedupe duplicata)', async () => {
    const h = makeHarness();
    await h.abrirOS();
    const bus = new InMemoryMessageBus();
    await startSagaReplyConsumer(bus, h.orchestrator);
    const msg = createEnvelope({
      type: 'DiagnosticoIniciado', sagaId: 's', correlationId: 'c',
      payload: { ordemServicoId: OS_ID, execucaoId: 'ex' },
    });
    await bus.send('os-saga-replies', msg);
    await bus.send('os-saga-replies', msg);
    expect((await h.os()).status).toBe('EM_DIAGNOSTICO');
    expect((await h.saga()).dados.execucaoId).toBe('ex');
  });

  it('o sweeper chama processarExpiradas periodicamente', async () => {
    const h = makeHarness();
    const spy = jest.spyOn(h.orchestrator, 'processarExpiradas').mockResolvedValue(0);
    const sweeper = createSagaTimeoutSweeper(h.orchestrator, 1);
    sweeper.start();
    for (let i = 0; i < 100 && spy.mock.calls.length < 2; i++) await new Promise((r) => setTimeout(r, 5));
    await sweeper.stop();
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('saga-config', () => {
  it.each([
    ['30s', 30_000], ['5m', 300_000], ['2h', 7_200_000], ['1d', 86_400_000],
    ['250', 250], ['500ms', 500], [undefined, 99], ['lixo', 99],
  ])('parseDuration(%s)', (input, esperado) => {
    expect(parseDuration(input as string | undefined, 99)).toBe(esperado);
  });

  it('lê timeouts e tentativas do ambiente, com defaults', () => {
    expect(sagaConfigFromEnv({ SAGA_TIMEOUT_APROVACAO: '5m', SAGA_TIMEOUT_PAGAMENTO: '10m' } as never))
      .toMatchObject({ timeoutAprovacaoMs: 300_000, timeoutPagamentoMs: 600_000, maxTentativasCompensacao: 3 });
    expect(sagaConfigFromEnv({ SAGA_MAX_TENTATIVAS_COMPENSACAO: '5' } as never).maxTentativasCompensacao).toBe(5);
  });
});
