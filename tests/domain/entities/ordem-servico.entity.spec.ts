import { OrdemServico } from '@domain/entities/ordem-servico.entity';

function makeOS(overrides: Partial<Parameters<typeof OrdemServico.create>[0]> = {}): OrdemServico {
  return OrdemServico.create({
    numeroOS: 'OS-20240315-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 45000,
    ...overrides,
  });
}

describe('OrdemServico entity', () => {
  describe('create', () => {
    it('creates with status RECEBIDA by default', () => {
      const os = makeOS();
      expect(os.status).toBe('RECEBIDA');
    });

    it('sets dataAbertura automatically', () => {
      const before = new Date();
      const os = makeOS();
      expect(os.dataAbertura.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('has no dataInicio or dataConclusao on creation', () => {
      const os = makeOS();
      expect(os.dataInicio).toBeUndefined();
      expect(os.dataConclusao).toBeUndefined();
    });

    it('stores all required fields', () => {
      const os = makeOS();
      expect(os.numeroOS).toBe('OS-20240315-0001');
      expect(os.clienteId).toBe('cliente-1');
      expect(os.veiculoId).toBe('veiculo-1');
      expect(os.quilometragemEntrada).toBe(45000);
      expect(os.id).toBeDefined();
    });

    it('accepts optional observacoes', () => {
      const os = makeOS({ observacoes: 'Veículo com barulho no motor' });
      expect(os.observacoes).toBe('Veículo com barulho no motor');
    });

    it('throws for negative quilometragemEntrada', () => {
      expect(() => makeOS({ quilometragemEntrada: -1 })).toThrow('Quilometragem de entrada não pode ser negativa');
    });

    it('throws for empty clienteId', () => {
      expect(() => makeOS({ clienteId: '' })).toThrow('clienteId é obrigatório');
    });

    it('throws for empty veiculoId', () => {
      expect(() => makeOS({ veiculoId: '' })).toThrow('veiculoId é obrigatório');
    });

    it('throws for empty numeroOS', () => {
      expect(() => makeOS({ numeroOS: '' })).toThrow('numeroOS é obrigatório');
    });

    it('temPagamento is false by default', () => {
      const os = makeOS();
      expect(os.temPagamento).toBe(false);
    });
  });

  describe('iniciar', () => {
    it('transitions from RECEBIDA to EM_DIAGNOSTICO', () => {
      const os = makeOS();
      const started = os.iniciar();
      expect(started.status).toBe('EM_DIAGNOSTICO');
    });

    it('sets dataInicio on transition', () => {
      const before = new Date();
      const os = makeOS();
      const started = os.iniciar();
      expect(started.dataInicio).toBeDefined();
      expect(started.dataInicio!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('returns a new instance (immutability)', () => {
      const os = makeOS();
      const started = os.iniciar();
      expect(started).not.toBe(os);
      expect(os.status).toBe('RECEBIDA');
    });

    it('throws when not RECEBIDA', () => {
      const os = makeOS();
      const started = os.iniciar();
      expect(() => started.iniciar()).toThrow('OS deve estar RECEBIDA para iniciar o diagnóstico');
    });
  });

  describe('aguardarAprovacao', () => {
    it('transitions from EM_DIAGNOSTICO to AGUARDANDO_APROVACAO', () => {
      const os = makeOS().iniciar().aguardarAprovacao();
      expect(os.status).toBe('AGUARDANDO_APROVACAO');
    });

    it('returns a new instance (immutability)', () => {
      const diagnostico = makeOS().iniciar();
      const aguardando = diagnostico.aguardarAprovacao();
      expect(aguardando).not.toBe(diagnostico);
      expect(diagnostico.status).toBe('EM_DIAGNOSTICO');
    });

    it('throws when not EM_DIAGNOSTICO', () => {
      const os = makeOS();
      expect(() => os.aguardarAprovacao()).toThrow('OS deve estar EM_DIAGNOSTICO para aguardar aprovação');
    });
  });

  describe('aprovar', () => {
    it('transitions from AGUARDANDO_APROVACAO to EM_EXECUCAO', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar();
      expect(os.status).toBe('EM_EXECUCAO');
    });

    it('returns a new instance (immutability)', () => {
      const aguardando = makeOS().iniciar().aguardarAprovacao();
      const aprovada = aguardando.aprovar();
      expect(aprovada).not.toBe(aguardando);
      expect(aguardando.status).toBe('AGUARDANDO_APROVACAO');
    });

    it('throws when not AGUARDANDO_APROVACAO', () => {
      const os = makeOS().iniciar();
      expect(() => os.aprovar()).toThrow('OS deve estar AGUARDANDO_APROVACAO para ser aprovada');
    });
  });

  describe('concluir', () => {
    it('transitions from EM_EXECUCAO to FINALIZADA', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar();
      const concluded = os.concluir();
      expect(concluded.status).toBe('FINALIZADA');
    });

    it('sets dataConclusao on transition', () => {
      const before = new Date();
      const os = makeOS().iniciar().aguardarAprovacao().aprovar().concluir();
      expect(os.dataConclusao).toBeDefined();
      expect(os.dataConclusao!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('returns a new instance (immutability)', () => {
      const emExecucao = makeOS().iniciar().aguardarAprovacao().aprovar();
      const finalizada = emExecucao.concluir();
      expect(finalizada).not.toBe(emExecucao);
      expect(emExecucao.status).toBe('EM_EXECUCAO');
    });

    it('throws when not EM_EXECUCAO', () => {
      const os = makeOS();
      expect(() => os.concluir()).toThrow('OS deve estar EM_EXECUCAO para ser finalizada');
    });
  });

  describe('entregar', () => {
    it('transitions from FINALIZADA to ENTREGUE', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar().concluir().entregar();
      expect(os.status).toBe('ENTREGUE');
    });

    it('returns a new instance (immutability)', () => {
      const finalizada = makeOS().iniciar().aguardarAprovacao().aprovar().concluir();
      const entregue = finalizada.entregar();
      expect(entregue).not.toBe(finalizada);
      expect(finalizada.status).toBe('FINALIZADA');
    });

    it('throws when not FINALIZADA', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar();
      expect(() => os.entregar()).toThrow('OS deve estar FINALIZADA para ser entregue');
    });
  });

  describe('cancelar', () => {
    it('transitions from RECEBIDA to CANCELADA', () => {
      const os = makeOS();
      const cancelled = os.cancelar('Cliente desistiu');
      expect(cancelled.status).toBe('CANCELADA');
    });

    it('transitions from EM_EXECUCAO to CANCELADA', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar();
      const cancelled = os.cancelar('Problema identificado');
      expect(cancelled.status).toBe('CANCELADA');
    });

    it('stores the motivo', () => {
      const os = makeOS();
      const cancelled = os.cancelar('Cliente desistiu');
      expect(cancelled.motivoCancelamento).toBe('Cliente desistiu');
    });

    it('throws when already FINALIZADA', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar().concluir();
      expect(() => os.cancelar('Tentativa')).toThrow('OS finalizada ou entregue não pode ser cancelada');
    });

    it('throws when already ENTREGUE', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar().concluir().entregar();
      expect(() => os.cancelar('Tentativa')).toThrow('OS finalizada ou entregue não pode ser cancelada');
    });

    it('throws when already CANCELADA', () => {
      const os = makeOS().cancelar('Primeiro motivo');
      expect(() => os.cancelar('Segundo motivo')).toThrow('OS já está cancelada');
    });

    it('throws when payment has been registered', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar().registrarPagamento();
      expect(() => os.cancelar('Tentativa')).toThrow('OS com pagamento não pode ser cancelada');
    });

    it('requires a non-empty motivo', () => {
      const os = makeOS();
      expect(() => os.cancelar('')).toThrow('Motivo de cancelamento é obrigatório');
    });
  });

  describe('registrarPagamento', () => {
    it('marks temPagamento as true on EM_EXECUCAO', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar().registrarPagamento();
      expect(os.temPagamento).toBe(true);
    });

    it('throws when OS is not EM_EXECUCAO or FINALIZADA', () => {
      const os = makeOS();
      expect(() => os.registrarPagamento()).toThrow('Pagamento só pode ser registrado em OS em execução ou finalizada');
    });

    it('allows registering payment on FINALIZADA OS', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar().concluir();
      const paid = os.registrarPagamento();
      expect(paid.temPagamento).toBe(true);
    });

    it('returns a new instance (immutability)', () => {
      const os = makeOS().iniciar().aguardarAprovacao().aprovar();
      const paid = os.registrarPagamento();
      expect(paid).not.toBe(os);
      expect(os.temPagamento).toBe(false);
    });
  });
});
