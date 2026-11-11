import { SagaConcurrencyError } from '@domain/repositories/saga.repository';
import { ValidationError } from '@shared/errors/domain.error';
import { makeHarness, OS_ID } from './saga-harness';

type H = ReturnType<typeof makeHarness>;
/** Só comandos/eventos relevantes (sem OrdemServicoStatusAlterado). */
const comandos = (h: H) => h.outbox.types.filter((t) => t !== 'OrdemServicoStatusAlterado');

const motivoCancelamento = async (h: H) => (await h.os()).motivoCancelamento;

describe('SagaOrchestrator — caminho feliz', () => {
  it('conduz da abertura à finalização, na ordem do contrato', async () => {
    const h = makeHarness();
    await h.conduzir('reparo');
    await h.responder('ReparoConcluido', { execucaoId: 'ex-1' });

    expect(comandos(h)).toEqual([
      'SolicitarDiagnostico',
      'GerarOrcamento',
      'SolicitarPagamento',
      'IniciarReparo',
    ]);
    const os = await h.os();
    expect(os.status).toBe('FINALIZADA');
    expect(os.temPagamento).toBe(true);
    expect((await h.saga()).status).toBe('CONCLUIDA');
    // estoque: reservou 2 e baixou 2 definitivamente
    expect(h.estoqueRepo.items.get('peca-1')).toEqual({ disp: 3, res: 0 });
  });

  it('GerarOrcamento leva itens precificados pelo OS e o cliente', async () => {
    const h = makeHarness();
    await h.conduzir('diagnostico');
    const [cmd] = h.outbox.ofType('GerarOrcamento');
    expect(cmd.payload).toMatchObject({
      ordemServicoId: OS_ID,
      valorTotal: 610,
      cliente: { id: 'cli-1', nome: 'Maria', cpfCnpj: '12345678909' },
      itens: [
        { tipo: 'SERVICO', quantidade: 1, valorUnitario: 250 },
        { tipo: 'PECA', referenciaId: 'peca-1', quantidade: 2, valorUnitario: 180 },
      ],
    });
    expect(cmd.correlationId).toBe('corr-1');
  });

  it('percorre os status da OS e registra o histórico', async () => {
    const h = makeHarness();
    await h.conduzir('reparo');
    await h.responder('ReparoConcluido', { execucaoId: 'ex-1' });
    const status = (await h.historico.listByOrdemServico(OS_ID)).map((e) => e.statusNovo);
    expect(status).toEqual([
      'RECEBIDA',
      'EM_DIAGNOSTICO',
      'AGUARDANDO_APROVACAO',
      'AGUARDANDO_PAGAMENTO',
      'EM_EXECUCAO',
      'FINALIZADA',
    ]);
    expect(h.notificacoes.map((n) => n.status)).toEqual(status.slice(1));
  });

  it('publica OrdemServicoStatusAlterado no tópico a cada transição', async () => {
    const h = makeHarness();
    await h.conduzir('diagnostico');
    const eventos = h.outbox.entries.filter((e) => e.envelope.type === 'OrdemServicoStatusAlterado');
    expect(eventos.length).toBeGreaterThan(0);
    expect(eventos.every((e) => e.kind === 'topic' && e.destination === 'oficina-eventos')).toBe(true);
  });

  it('PagamentoSolicitado expõe o initPoint na saga', async () => {
    const h = makeHarness();
    await h.conduzir('aprovacao');
    await h.responder('PagamentoSolicitado', {
      orcamentoId: 'orc-1', pagamentoId: 'pg-1', initPoint: 'http://mp', expiraEm: 'x',
    });
    expect((await h.saga()).dados.initPoint).toBe('http://mp');
    expect((await h.os()).status).toBe('AGUARDANDO_PAGAMENTO');
  });
});

describe('SagaOrchestrator — idempotência e ordem', () => {
  it('a mesma mensagem entregue 2x executa o handler 1x', async () => {
    const h = makeHarness();
    await h.abrirOS();
    await h.responder('DiagnosticoIniciado', { execucaoId: 'ex-1' });
    const payload = {
      execucaoId: 'ex-1',
      servicos: [{ catalogoServicoId: 'cat-1', pecas: [{ pecaId: 'peca-1', quantidade: 2 }] }],
    };
    await h.responder('DiagnosticoConcluido', payload, 'msg-dup');
    await h.responder('DiagnosticoConcluido', payload, 'msg-dup');
    expect(h.outbox.ofType('GerarOrcamento')).toHaveLength(1);
    expect(h.estoqueRepo.items.get('peca-1')).toEqual({ disp: 3, res: 2 });
  });

  it('resposta de passo já superado (outro messageId) vira no-op registrado', async () => {
    const h = makeHarness();
    await h.conduzir('diagnostico');
    await h.responder('DiagnosticoConcluido', { execucaoId: 'ex-1', servicos: [] });
    expect(h.outbox.ofType('GerarOrcamento')).toHaveLength(1);
    expect(h.sagas.logs.some((l) => l.resultado === 'IGNORADO')).toBe(true);
  });

  it('resposta fora de ordem (OrcamentoGerado antes do diagnóstico) é ignorada', async () => {
    const h = makeHarness();
    await h.abrirOS();
    await h.responder('OrcamentoGerado', { orcamentoId: 'o', valorTotal: 1, validadeAte: 'x' });
    expect((await h.os()).status).toBe('RECEBIDA');
    expect((await h.saga()).passoAtual).toBe('DIAGNOSTICO');
  });

  it('evento sem ação no estado atual é ignorado', async () => {
    const h = makeHarness();
    await h.abrirOS();
    await h.responder('PagamentoEstornado', { pagamentoId: 'p', mpRefundId: 'r' });
    expect(h.sagas.logs.some((l) => l.resultado === 'IGNORADO')).toBe(true);
  });

  it('resposta para OS sem saga é descartada sem erro', async () => {
    const h = makeHarness();
    await expect(h.responder('DiagnosticoIniciado', { execucaoId: 'e' })).resolves.toBeDefined();
  });

  it('payload sem ordemServicoId é erro (vai para retry/DLQ)', async () => {
    const h = makeHarness();
    await expect(
      h.orchestrator.handleReply({
        messageId: 'm', type: 'DiagnosticoIniciado', version: 1, sagaId: 's',
        correlationId: 'c', occurredAt: new Date().toISOString(), payload: {},
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('colisão de versão (lock otimista) desfaz tudo, inclusive o inbox: a reentrega funciona', async () => {
    const h = makeHarness();
    await h.abrirOS();
    h.sagas.falharProximaAtualizacao = true;
    await expect(
      h.responder('DiagnosticoIniciado', { execucaoId: 'ex-1' }, 'msg-1'),
    ).rejects.toThrow(SagaConcurrencyError);
    expect(h.inbox.seen.has('msg-1')).toBe(false);
    expect((await h.os()).status).toBe('RECEBIDA');

    await h.responder('DiagnosticoIniciado', { execucaoId: 'ex-1' }, 'msg-1');
    expect((await h.os()).status).toBe('EM_DIAGNOSTICO');
  });
});

describe('SagaOrchestrator — falhas e compensações (em ordem inversa)', () => {
  it('DiagnosticoFalhou: nada a compensar, OS cancelada', async () => {
    const h = makeHarness();
    await h.abrirOS();
    await h.responder('DiagnosticoFalhou', { motivo: 'sem mecânico' });
    expect(comandos(h)).toEqual(['SolicitarDiagnostico']);
    expect((await h.os()).status).toBe('CANCELADA');
    expect(await motivoCancelamento(h)).toBe('sem mecânico');
    expect((await h.saga()).status).toBe('COMPENSADA');
  });

  it('estoque insuficiente: cancela a execução e não deixa reserva pendurada', async () => {
    const h2 = makeHarness();
    await h2.abrirOS();
    await h2.responder('DiagnosticoConcluido', {
      execucaoId: 'ex-1',
      servicos: [{ catalogoServicoId: 'cat-1', pecas: [{ pecaId: 'peca-1', quantidade: 99 }] }],
    });
    expect(h2.estoqueRepo.items.get('peca-1')).toEqual({ disp: 5, res: 0 });
    expect(comandos(h2)).toEqual(['SolicitarDiagnostico', 'CancelarExecucao']);
    await h2.responder('ExecucaoCancelada', { execucaoId: 'ex-1' });
    expect((await h2.os()).status).toBe('CANCELADA');
    expect(await motivoCancelamento(h2)).toMatch(/Estoque insuficiente/);
    expect((await h2.saga()).status).toBe('COMPENSADA');
  });

  it('item do catálogo inexistente: compensa sem reservar nada', async () => {
    const h = makeHarness();
    await h.abrirOS();
    await h.responder('DiagnosticoConcluido', {
      execucaoId: 'ex-1',
      servicos: [{ catalogoServicoId: 'nao-existe', pecas: [] }],
    });
    expect(comandos(h)).toEqual(['SolicitarDiagnostico', 'CancelarExecucao']);
  });

  it('reserva parcial que falha na 2ª peça desfaz a 1ª', async () => {
    const h = makeHarness();
    // 2 serviços pedem 3+3 da mesma peça com saldo 5: a 1ª reserva é desfeita
    await h.abrirOS();
    await h.responder('DiagnosticoConcluido', {
      execucaoId: 'ex-1',
      servicos: [
        { catalogoServicoId: 'cat-1', pecas: [{ pecaId: 'peca-1', quantidade: 3 }] },
        { catalogoServicoId: 'cat-1', pecas: [{ pecaId: 'peca-1', quantidade: 3 }] },
      ],
    });
    expect(h.estoqueRepo.items.get('peca-1')).toEqual({ disp: 5, res: 0 });
  });

  it('OrcamentoFalhou: libera a reserva e cancela a execução', async () => {
    const h = makeHarness();
    await h.conduzir('diagnostico');
    await h.responder('OrcamentoFalhou', { motivo: 'erro no billing' });
    expect(h.estoqueRepo.items.get('peca-1')).toEqual({ disp: 5, res: 0 });
    expect(comandos(h).slice(-1)).toEqual(['CancelarExecucao']);
    expect(h.outbox.ofType('CancelarOrcamento')).toHaveLength(0);
    await h.responder('ExecucaoCancelada', {});
    expect((await h.os()).status).toBe('CANCELADA');
  });

  it('OrcamentoRecusado: não cancela o orçamento (já recusado), libera e cancela execução', async () => {
    const h = makeHarness();
    await h.conduzir('orcamento');
    await h.responder('OrcamentoRecusado', { orcamentoId: 'orc-1', motivo: 'caro' });
    expect(h.outbox.ofType('CancelarOrcamento')).toHaveLength(0);
    expect(h.estoqueRepo.items.get('peca-1')).toEqual({ disp: 5, res: 0 });
    await h.responder('ExecucaoCancelada', {});
    const os = await h.os();
    expect(os.status).toBe('CANCELADA');
    expect(os.motivoCancelamento).toBe('caro');
  });

  it('timeout de aprovação: cancela orçamento, libera reserva e cancela execução, nessa ordem', async () => {
    const h = makeHarness({ timeoutAprovacaoMs: 1000 });
    await h.conduzir('orcamento');
    h.avancarRelogio(1001);
    expect(await h.orchestrator.processarExpiradas()).toBe(1);
    expect(comandos(h).slice(-1)).toEqual(['CancelarOrcamento']);
    await h.responder('OrcamentoCancelado', { orcamentoId: 'orc-1' });
    expect(comandos(h).slice(-1)).toEqual(['CancelarExecucao']);
    expect(h.estoqueRepo.items.get('peca-1')).toEqual({ disp: 5, res: 0 });
    await h.responder('ExecucaoCancelada', {});
    expect((await h.os()).status).toBe('CANCELADA');
    expect(await motivoCancelamento(h)).toMatch(/Timeout/);
    expect((await h.saga()).status).toBe('COMPENSADA');
  });

  it('sweeper não age antes do vencimento', async () => {
    const h = makeHarness({ timeoutAprovacaoMs: 1000 });
    await h.conduzir('orcamento');
    h.avancarRelogio(500);
    expect(await h.orchestrator.processarExpiradas()).toBe(0);
    expect((await h.saga()).status).toBe('EM_ANDAMENTO');
  });

  it('PagamentoRecusado: cancela orçamento e execução (sem estorno)', async () => {
    const h = makeHarness();
    await h.conduzir('aprovacao');
    await h.responder('PagamentoRecusado', { orcamentoId: 'orc-1', motivo: 'cartão recusado' });
    expect(h.outbox.ofType('EstornarPagamento')).toHaveLength(0);
    expect(comandos(h).slice(-1)).toEqual(['CancelarOrcamento']);
    await h.responder('OrcamentoCancelado', {});
    await h.responder('ExecucaoCancelada', {});
    expect((await h.os()).status).toBe('CANCELADA');
  });

  it('timeout de pagamento com pagamento criado: estorna (cancela a cobrança) antes de tudo', async () => {
    const h = makeHarness({ timeoutPagamentoMs: 1000 });
    await h.conduzir('aprovacao');
    await h.responder('PagamentoSolicitado', {
      orcamentoId: 'orc-1', pagamentoId: 'pg-1', initPoint: 'u', expiraEm: 'x',
    });
    h.avancarRelogio(1001);
    await h.orchestrator.processarExpiradas();
    expect(comandos(h).slice(-1)).toEqual(['EstornarPagamento']);
  });

  it('ReparoFalhou: estorna → cancela orçamento → libera reserva → cancela execução → cancela OS', async () => {
    const h = makeHarness();
    await h.conduzir('reparo');
    await h.responder('ReparoFalhou', { execucaoId: 'ex-1', motivo: 'peça indisponível' });

    expect(comandos(h).slice(-1)).toEqual(['EstornarPagamento']);
    expect((await h.saga()).status).toBe('COMPENSANDO');
    expect((await h.os()).temPagamento).toBe(true);

    await h.responder('PagamentoEstornado', { pagamentoId: 'pg-1', mpRefundId: 'r1' });
    expect(comandos(h).slice(-1)).toEqual(['CancelarOrcamento']);
    await h.responder('OrcamentoCancelado', { orcamentoId: 'orc-1' });
    expect(comandos(h).slice(-1)).toEqual(['CancelarExecucao']);
    expect(h.estoqueRepo.items.get('peca-1')).toEqual({ disp: 5, res: 0 });
    await h.responder('ExecucaoCancelada', { execucaoId: 'ex-1' });

    const os = await h.os();
    expect(os.status).toBe('CANCELADA');
    expect(os.temPagamento).toBe(false);
    expect(os.motivoCancelamento).toBe('peça indisponível');
    expect((await h.saga()).status).toBe('COMPENSADA');
    const ordem = comandos(h).filter((t) =>
      ['EstornarPagamento', 'CancelarOrcamento', 'CancelarExecucao'].includes(t),
    );
    expect(ordem).toEqual(['EstornarPagamento', 'CancelarOrcamento', 'CancelarExecucao']);
  });

  it('confirmação duplicada de compensação não avança duas vezes', async () => {
    const h = makeHarness();
    await h.conduzir('reparo');
    await h.responder('ReparoFalhou', { execucaoId: 'ex-1', motivo: 'x' });
    await h.responder('PagamentoEstornado', { pagamentoId: 'pg-1', mpRefundId: 'r1' });
    await h.responder('PagamentoEstornado', { pagamentoId: 'pg-1', mpRefundId: 'r1' });
    expect(h.outbox.ofType('CancelarOrcamento')).toHaveLength(1);
  });
});

describe('SagaOrchestrator — falha de compensação', () => {
  const ateEstornoFalhar = async (h: H) => {
    await h.conduzir('reparo');
    await h.responder('ReparoFalhou', { execucaoId: 'ex-1', motivo: 'x' });
  };

  it('EstornoFalhou é retentado e, esgotadas as tentativas, vai para FALHA_COMPENSACAO', async () => {
    const h = makeHarness({ maxTentativasCompensacao: 3 });
    await ateEstornoFalhar(h);
    expect(h.outbox.ofType('EstornarPagamento')).toHaveLength(1);
    await h.responder('EstornoFalhou', { pagamentoId: 'pg-1', motivo: 'mp fora' });
    expect(h.outbox.ofType('EstornarPagamento')).toHaveLength(2);
    await h.responder('EstornoFalhou', { pagamentoId: 'pg-1', motivo: 'mp fora' });
    expect(h.outbox.ofType('EstornarPagamento')).toHaveLength(3);
    await h.responder('EstornoFalhou', { pagamentoId: 'pg-1', motivo: 'mp fora' });
    expect((await h.saga()).status).toBe('FALHA_COMPENSACAO');
    expect(h.outbox.ofType('EstornarPagamento')).toHaveLength(3);
    // OS permanece com pagamento (intervenção manual), não é cancelada
    expect((await h.os()).status).toBe('EM_EXECUCAO');
  });

  it('compensação sem resposta é reenviada pelo sweeper', async () => {
    const h = makeHarness({ timeoutCompensacaoMs: 1000 });
    await ateEstornoFalhar(h);
    h.avancarRelogio(1001);
    await h.orchestrator.processarExpiradas();
    expect(h.outbox.ofType('EstornarPagamento')).toHaveLength(2);
  });

  it('compensação sem resposta esgota tentativas via sweeper', async () => {
    const h = makeHarness({ timeoutCompensacaoMs: 1000, maxTentativasCompensacao: 2 });
    await ateEstornoFalhar(h);
    for (let i = 0; i < 2; i++) {
      h.avancarRelogio(1001);
      await h.orchestrator.processarExpiradas();
    }
    expect((await h.saga()).status).toBe('FALHA_COMPENSACAO');
  });

  it('pagamento confirmado depois do timeout dispara estorno (dinheiro entrou)', async () => {
    const h = makeHarness({ timeoutPagamentoMs: 1000 });
    await h.conduzir('aprovacao');
    h.avancarRelogio(1001);
    await h.orchestrator.processarExpiradas(); // sem pagamentoId: cancela orçamento
    await h.responder('OrcamentoCancelado', {});
    await h.responder('ExecucaoCancelada', {});
    expect((await h.saga()).status).toBe('COMPENSADA');

    await h.responder('PagamentoConfirmado', {
      orcamentoId: 'orc-1', pagamentoId: 'pg-9', mpPaymentId: '9', valor: 610, confirmadoEm: 'x',
    });
    expect((await h.saga()).status).toBe('COMPENSANDO');
    expect(comandos(h).slice(-1)).toEqual(['EstornarPagamento']);
    await h.responder('PagamentoEstornado', { pagamentoId: 'pg-9', mpRefundId: 'r' });
    expect((await h.saga()).status).toBe('COMPENSADA');
    expect((await h.os()).status).toBe('CANCELADA');
  });

  it('pagamento confirmado durante outra compensação em curso é enfileirado', async () => {
    const h = makeHarness({ timeoutPagamentoMs: 1000 });
    await h.conduzir('aprovacao');
    h.avancarRelogio(1001);
    await h.orchestrator.processarExpiradas();
    await h.responder('PagamentoConfirmado', {
      orcamentoId: 'orc-1', pagamentoId: 'pg-9', mpPaymentId: '9', valor: 610, confirmadoEm: 'x',
    });
    await h.responder('OrcamentoCancelado', {});
    await h.responder('ExecucaoCancelada', {});
    expect(comandos(h).slice(-1)).toEqual(['EstornarPagamento']);
    await h.responder('PagamentoEstornado', { pagamentoId: 'pg-9', mpRefundId: 'r' });
    expect((await h.saga()).status).toBe('COMPENSADA');
  });
});

describe('SagaOrchestrator — cancelamento manual', () => {
  it('dispara a compensação (não só troca o status)', async () => {
    const h = makeHarness();
    await h.conduzir('orcamento');
    const retorno = await h.orchestrator.cancelar(OS_ID, 'cliente desistiu');
    expect(retorno.status).toBe('AGUARDANDO_APROVACAO');
    expect((await h.saga()).status).toBe('COMPENSANDO');
    expect(comandos(h).slice(-1)).toEqual(['CancelarOrcamento']);
    await h.responder('OrcamentoCancelado', {});
    await h.responder('ExecucaoCancelada', {});
    const os = await h.os();
    expect(os.status).toBe('CANCELADA');
    expect(os.motivoCancelamento).toBe('cliente desistiu');
  });

  it('durante o diagnóstico cancela a execução', async () => {
    const h = makeHarness();
    await h.abrirOS();
    await h.orchestrator.cancelar(OS_ID, 'desistência');
    expect(comandos(h).slice(-1)).toEqual(['CancelarExecucao']);
  });

  it('com pagamento confirmado estorna antes de cancelar', async () => {
    const h = makeHarness();
    await h.conduzir('pagamento');
    await h.orchestrator.cancelar(OS_ID, 'desistência');
    expect(comandos(h).slice(-1)).toEqual(['EstornarPagamento']);
  });

  it('exige motivo', async () => {
    const h = makeHarness();
    await h.abrirOS();
    await expect(h.orchestrator.cancelar(OS_ID, '  ')).rejects.toThrow('Motivo');
  });

  it('não cancela OS já em cancelamento', async () => {
    const h = makeHarness();
    await h.abrirOS();
    await h.orchestrator.cancelar(OS_ID, 'a');
    await expect(h.orchestrator.cancelar(OS_ID, 'b')).rejects.toThrow(ValidationError);
  });

  it('não cancela OS finalizada', async () => {
    const h = makeHarness();
    await h.conduzir('reparo');
    await h.responder('ReparoConcluido', { execucaoId: 'ex-1' });
    await expect(h.orchestrator.cancelar(OS_ID, 'tarde')).rejects.toThrow('finalizada');
  });

  it('OS inexistente: NotFound', async () => {
    const h = makeHarness();
    await expect(h.orchestrator.cancelar('nope', 'x')).rejects.toThrow('não encontrada');
  });

  it('OS legada, sem saga, é cancelada diretamente', async () => {
    const h = makeHarness();
    const { OrdemServico } = await import('@domain/entities/ordem-servico.entity');
    await h.ordens.save(
      OrdemServico.create({ id: 'legada', numeroOS: 'OS-1', clienteId: 'c', veiculoId: 'v', quilometragemEntrada: 0 }),
    );
    const os = await h.orchestrator.cancelar('legada', 'motivo');
    expect(os.status).toBe('CANCELADA');
  });
});
