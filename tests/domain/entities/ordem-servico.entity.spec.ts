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
    it('creates with status ABERTA by default', () => {
      const os = makeOS();
      expect(os.status).toBe('ABERTA');
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
    it('transitions from ABERTA to EM_ANDAMENTO', () => {
      const os = makeOS();
      const started = os.iniciar();
      expect(started.status).toBe('EM_ANDAMENTO');
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
      expect(os.status).toBe('ABERTA');
    });

    it('throws when not ABERTA', () => {
      const os = makeOS();
      const started = os.iniciar();
      expect(() => started.iniciar()).toThrow('OS deve estar ABERTA para ser iniciada');
    });
  });

  describe('concluir', () => {
    it('transitions from EM_ANDAMENTO to CONCLUIDA', () => {
      const os = makeOS().iniciar();
      const concluded = os.concluir();
      expect(concluded.status).toBe('CONCLUIDA');
    });

    it('sets dataConclusao on transition', () => {
      const before = new Date();
      const os = makeOS().iniciar().concluir();
      expect(os.dataConclusao).toBeDefined();
      expect(os.dataConclusao!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('returns a new instance (immutability)', () => {
      const started = makeOS().iniciar();
      const concluded = started.concluir();
      expect(concluded).not.toBe(started);
      expect(started.status).toBe('EM_ANDAMENTO');
    });

    it('throws when not EM_ANDAMENTO', () => {
      const os = makeOS();
      expect(() => os.concluir()).toThrow('OS deve estar EM_ANDAMENTO para ser concluída');
    });
  });

  describe('cancelar', () => {
    it('transitions from ABERTA to CANCELADA', () => {
      const os = makeOS();
      const cancelled = os.cancelar('Cliente desistiu');
      expect(cancelled.status).toBe('CANCELADA');
    });

    it('transitions from EM_ANDAMENTO to CANCELADA', () => {
      const os = makeOS().iniciar();
      const cancelled = os.cancelar('Problema identificado');
      expect(cancelled.status).toBe('CANCELADA');
    });

    it('stores the motivo', () => {
      const os = makeOS();
      const cancelled = os.cancelar('Cliente desistiu');
      expect(cancelled.motivoCancelamento).toBe('Cliente desistiu');
    });

    it('throws when already CONCLUIDA', () => {
      const os = makeOS().iniciar().concluir();
      expect(() => os.cancelar('Tentativa')).toThrow('OS concluída não pode ser cancelada');
    });

    it('throws when already CANCELADA', () => {
      const os = makeOS().cancelar('Primeiro motivo');
      expect(() => os.cancelar('Segundo motivo')).toThrow('OS já está cancelada');
    });

    it('throws when payment has been registered', () => {
      const os = makeOS().iniciar().registrarPagamento();
      expect(() => os.cancelar('Tentativa')).toThrow('OS com pagamento não pode ser cancelada');
    });

    it('requires a non-empty motivo', () => {
      const os = makeOS();
      expect(() => os.cancelar('')).toThrow('Motivo de cancelamento é obrigatório');
    });
  });

  describe('registrarPagamento', () => {
    it('marks temPagamento as true', () => {
      const os = makeOS().iniciar().registrarPagamento();
      expect(os.temPagamento).toBe(true);
    });

    it('throws when OS is not EM_ANDAMENTO or CONCLUIDA', () => {
      const os = makeOS();
      expect(() => os.registrarPagamento()).toThrow('Pagamento só pode ser registrado em OS em andamento ou concluída');
    });

    it('allows registering payment on CONCLUIDA OS', () => {
      const os = makeOS().iniciar().concluir();
      const paid = os.registrarPagamento();
      expect(paid.temPagamento).toBe(true);
    });

    it('returns a new instance (immutability)', () => {
      const os = makeOS().iniciar();
      const paid = os.registrarPagamento();
      expect(paid).not.toBe(os);
      expect(os.temPagamento).toBe(false);
    });
  });
});
