import { defineFeature, loadFeature } from 'jest-cucumber';
import { Mundo } from './world';

const feature = loadFeature('tests/bdd/features/ciclo-os.feature');

const lista = (s: string): string[] => s.split(',').map((x) => x.trim());

defineFeature(feature, (test) => {
  let mundo: Mundo;

  beforeEach(() => {
    mundo = new Mundo();
  });

  /** Passos compartilhados entre os cenários. */
  const contexto = ({ given, and }: { given: Function; and: Function }): void => {
    given(/^que existe estoque de (\d+) unidades da peça "(.*)"$/, (qtd: string, peca: string) => {
      mundo.h.estoqueRepo.items.set(peca, { disp: Number(qtd), res: 0 });
    });
    and(/^que o serviço "(.*)" custa (\d+) e a peça custa (\d+)$/, () => {
      // precificação já está no harness (serviço 250, peça 180): o passo documenta o cenário
    });
  };

  const abertura = ({ given }: { given: Function }): void => {
    given('que uma OS foi aberta', async () => {
      await mundo.abrirOS();
    });
  };

  const checagens = (steps: { then: Function; and: Function }): void => {
    const { then, and } = steps;
    then(/^a OS está "(.*)"$/, async (status: string) => {
      expect((await mundo.h.os()).status).toBe(status);
    });
    and(/^a saga está "(.*)"$/, async (status: string) => {
      expect((await mundo.h.saga()).status).toBe(status);
    });
    and(/^o estoque tem (\d+) disponíveis e (\d+) reservadas$/, (disp: string, res: string) => {
      expect(mundo.h.estoqueRepo.items.get('peca-1')).toEqual({ disp: Number(disp), res: Number(res) });
    });
  };

  test('Caminho feliz da abertura à finalização', (steps) => {
    const { given, when, and } = steps;
    contexto(steps); abertura(steps);
    when(/^o mecânico conclui o diagnóstico com (\d+) unidades da peça$/, async (n: string) => mundo.concluirDiagnostico(Number(n)));
    and('o cliente aprova o orçamento', async () => mundo.evento('OrcamentoAprovado', { orcamentoId: 'orc-1', aprovadoEm: 'x' }));
    and('o pagamento é confirmado', async () =>
      mundo.evento('PagamentoConfirmado', { orcamentoId: 'orc-1', pagamentoId: 'pg-1', mpPaymentId: '1', valor: 610, confirmadoEm: 'x' }));
    and('o mecânico conclui o reparo', async () => mundo.evento('ReparoConcluido', { execucaoId: 'ex-1' }));
    checagens(steps);
    and(/^os comandos foram emitidos na ordem "(.*)"$/, (ordem: string) => {
      expect(mundo.tiposDosComandos()).toEqual(lista(ordem));
    });
    void given;
  });

  test('Orçamento recusado desfaz reserva e execução', (steps) => {
    const { when, and } = steps;
    contexto(steps); abertura(steps);
    when(/^o mecânico conclui o diagnóstico com (\d+) unidades da peça$/, async (n: string) => mundo.concluirDiagnostico(Number(n)));
    and('o cliente recusa o orçamento', async () => mundo.evento('OrcamentoRecusado', { orcamentoId: 'orc-1', motivo: 'caro' }));
    checagens(steps);
    and(/^foram emitidos os comandos de compensação "(.*)"$/, (ordem: string) => {
      expect(mundo.compensacoes()).toEqual(lista(ordem));
    });
    and('nenhum estorno foi pedido', () => expect(mundo.vezes('EstornarPagamento')).toBe(0));
  });

  test('Pagamento recusado cancela orçamento, reserva e execução', (steps) => {
    const { when, and } = steps;
    contexto(steps); abertura(steps);
    when(/^o mecânico conclui o diagnóstico com (\d+) unidades da peça$/, async (n: string) => mundo.concluirDiagnostico(Number(n)));
    and('o cliente aprova o orçamento', async () => mundo.evento('OrcamentoAprovado', { orcamentoId: 'orc-1', aprovadoEm: 'x' }));
    and('o pagamento é recusado', async () =>
      mundo.evento('PagamentoRecusado', { orcamentoId: 'orc-1', pagamentoId: 'pg-1', motivo: 'rejected: cc_rejected_other_reason' }));
    checagens(steps);
    and(/^foram emitidos os comandos de compensação "(.*)"$/, (ordem: string) => {
      expect(mundo.compensacoes()).toEqual(lista(ordem));
    });
    and('nenhum estorno foi pedido', () => expect(mundo.vezes('EstornarPagamento')).toBe(0));
  });

  test('Falha no reparo estorna o pagamento e desfaz tudo', (steps) => {
    const { when, and } = steps;
    contexto(steps); abertura(steps);
    when(/^o mecânico conclui o diagnóstico com (\d+) unidades da peça$/, async (n: string) => mundo.concluirDiagnostico(Number(n)));
    and('o cliente aprova o orçamento', async () => mundo.evento('OrcamentoAprovado', { orcamentoId: 'orc-1', aprovadoEm: 'x' }));
    and('o pagamento é confirmado', async () =>
      mundo.evento('PagamentoConfirmado', { orcamentoId: 'orc-1', pagamentoId: 'pg-1', mpPaymentId: '1', valor: 610, confirmadoEm: 'x' }));
    and('o reparo falha', async () => mundo.evento('ReparoFalhou', { execucaoId: 'ex-1', motivo: 'motor fundido' }));
    checagens(steps);
    and(/^foram emitidos os comandos de compensação "(.*)"$/, (ordem: string) => {
      expect(mundo.compensacoes()).toEqual(lista(ordem));
    });
  });

  test('Cliente não aprova a tempo', (steps) => {
    const { when, and } = steps;
    contexto(steps); abertura(steps);
    when(/^o mecânico conclui o diagnóstico com (\d+) unidades da peça$/, async (n: string) => mundo.concluirDiagnostico(Number(n)));
    and('passa o prazo de aprovação', async () => {
      mundo.h.avancarRelogio(61_000);
      await mundo.h.orchestrator.processarExpiradas();
      await mundo.estabilizar();
    });
    checagens(steps);
    and(/^foram emitidos os comandos de compensação "(.*)"$/, (ordem: string) => {
      expect(mundo.compensacoes()).toEqual(lista(ordem));
    });
  });

  test('Mensagem duplicada não avança a saga duas vezes', (steps) => {
    const { when, then, and } = steps;
    contexto(steps); abertura(steps);
    when(/^o diagnóstico concluído é entregue (\d+) vezes com o mesmo messageId$/, async (n: string) => {
      for (let i = 0; i < Number(n); i++) await mundo.concluirDiagnostico(2, 'msg-duplicada');
    });
    then(/^o orçamento foi solicitado (\d+) vez$/, (n: string) => expect(mundo.vezes('GerarOrcamento')).toBe(Number(n)));
    and(/^o estoque tem (\d+) disponíveis e (\d+) reservadas$/, (disp: string, res: string) => {
      expect(mundo.h.estoqueRepo.items.get('peca-1')).toEqual({ disp: Number(disp), res: Number(res) });
    });
  });
});
