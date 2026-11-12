import { parseEnvelope } from '@shared/messaging/envelope';
import { SAGA_REPLY_TYPES } from '@shared/messaging/messages';
import { Mundo } from '../bdd/world';
import { lerContrato } from './normalize';

/**
 * Consumidor: eventos que Billing e Execution REALMENTE produzem (`billing-events.json` e
 * `execution-events.json`, gerados pelos handlers reais dos outros repos e copiados para cá).
 * O orquestrador precisa aceitá-los e conduzir a Saga com eles.
 */
describe('contrato: eventos dos participantes → OS', () => {
  const eventos = [...lerContrato('billing-events.json'), ...lerContrato('execution-events.json')];

  it('cobrem exatamente os eventos da filter policy de os-saga-replies', () => {
    expect(eventos.map((e) => e.type).sort()).toEqual([...SAGA_REPLY_TYPES].sort());
  });

  it.each(eventos.map((e) => [e.type, e] as const))('%s é um envelope válido v1 com ordemServicoId', (_t, e) => {
    const env = parseEnvelope(e);
    expect(env.version).toBe(1);
    expect((env.payload as { ordemServicoId?: string }).ordemServicoId).toEqual(expect.any(String));
  });

  it('a Saga completa o caminho feliz usando os eventos reais', async () => {
    const m = new Mundo({}, eventos);
    await m.abrirOS();
    await m.eventoReal('DiagnosticoConcluido');
    await m.eventoReal('OrcamentoAprovado');
    await m.eventoReal('PagamentoConfirmado');
    await m.eventoReal('ReparoConcluido');
    expect((await m.h.os()).status).toBe('FINALIZADA');
    expect((await m.h.saga()).status).toBe('CONCLUIDA');
    expect(m.tiposDosComandos()).toEqual(['SolicitarDiagnostico', 'GerarOrcamento', 'SolicitarPagamento', 'IniciarReparo']);
  });

  it.each([
    ['OrcamentoRecusado', []],
    ['PagamentoRecusado', ['OrcamentoAprovado']],
    ['ReparoFalhou', ['OrcamentoAprovado', 'PagamentoConfirmado']],
    ['OrcamentoFalhou', []],
    ['DiagnosticoFalhou', 'antes'],
  ] as const)('a falha %s compensa até COMPENSADA com os eventos reais', async (falha, antes) => {
    const m = new Mundo({}, eventos);
    await m.abrirOS();
    if (antes === 'antes') {
      await m.eventoReal('DiagnosticoFalhou');
    } else {
      await m.eventoReal('DiagnosticoConcluido');
      for (const e of antes) await m.eventoReal(e);
      await m.eventoReal(falha);
    }
    expect((await m.h.os()).status).toBe('CANCELADA');
    expect((await m.h.saga()).status).toBe('COMPENSADA');
    expect(m.h.estoqueRepo.items.get('peca-1')).toEqual({ disp: 5, res: 0 });
  });
});
