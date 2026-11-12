import { Mundo } from '../bdd/world';
import { conferirContrato, normalizar, primeiroDeCada } from './normalize';

/**
 * Produtor: comandos que o OS emite para Billing e Execution. O JSON é copiado para os repos
 * `…-billing-service` e `…-execution-service` (`tests/contracts/os-commands.json`), onde
 * alimenta os handlers reais. Qualquer mudança aqui exige regenerar e copiar.
 */
describe('contrato: comandos emitidos pelo OS', () => {
  it('coincidem com tests/contracts/os-commands.json', async () => {
    // caminho feliz até a finalização + compensação completa (estorno) noutra OS
    const feliz = new Mundo();
    await feliz.abrirOS();
    await feliz.concluirDiagnostico(2);
    await feliz.evento('OrcamentoAprovado', { orcamentoId: 'orc-1', aprovadoEm: 'x' });
    await feliz.evento('PagamentoConfirmado', { orcamentoId: 'orc-1', pagamentoId: 'pg-1', mpPaymentId: '1', valor: 610, confirmadoEm: 'x' });

    const falha = new Mundo();
    await falha.abrirOS();
    await falha.concluirDiagnostico(2);
    await falha.evento('OrcamentoAprovado', { orcamentoId: 'orc-1', aprovadoEm: 'x' });
    await falha.evento('PagamentoConfirmado', { orcamentoId: 'orc-1', pagamentoId: 'pg-1', mpPaymentId: '1', valor: 610, confirmadoEm: 'x' });
    await falha.evento('ReparoFalhou', { execucaoId: 'ex-1', motivo: 'motor fundido' });

    const todos = [...feliz.comandos, ...falha.comandos];
    const primeiroDeCadaTipo = primeiroDeCada(todos);
    expect(primeiroDeCadaTipo.map((c) => c.type).sort()).toEqual([
      'CancelarExecucao', 'CancelarOrcamento', 'EstornarPagamento',
      'GerarOrcamento', 'IniciarReparo', 'SolicitarDiagnostico', 'SolicitarPagamento',
    ]);
    conferirContrato('os-commands.json', normalizar(primeiroDeCadaTipo));
  });
});
