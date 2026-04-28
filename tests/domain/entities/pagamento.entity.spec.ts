import { Pagamento } from '@domain/entities/pagamento.entity';

function makePagamento(overrides: Partial<{
  valor: number;
  formaPagamento: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'TRANSFERENCIA';
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
}> = {}): Pagamento {
  return Pagamento.create({
    ordemServicoId: 'os-uuid-1',
    valor: overrides.valor ?? 350.00,
    formaPagamento: overrides.formaPagamento ?? 'PIX',
    status: overrides.status,
  });
}

describe('Pagamento entity', () => {
  describe('create', () => {
    it('creates with defaults', () => {
      const p = makePagamento();
      expect(p.id).toBeDefined();
      expect(p.ordemServicoId).toBe('os-uuid-1');
      expect(p.valor).toBe(350);
      expect(p.formaPagamento).toBe('PIX');
      expect(p.status).toBe('PENDENTE');
      expect(p.dataPagamento).toBeUndefined();
      expect(p.criadoEm).toBeInstanceOf(Date);
    });

    it('preserves provided id', () => {
      const p = Pagamento.create({ id: 'pgto-123', ordemServicoId: 'os-1', valor: 100, formaPagamento: 'DINHEIRO' });
      expect(p.id).toBe('pgto-123');
    });

    it('throws for empty ordemServicoId', () => {
      expect(() => Pagamento.create({ ordemServicoId: '', valor: 100, formaPagamento: 'PIX' }))
        .toThrow('ordemServicoId é obrigatório');
    });

    it('throws for zero valor', () => {
      expect(() => makePagamento({ valor: 0 })).toThrow('Valor deve ser maior que zero');
    });

    it('throws for negative valor', () => {
      expect(() => makePagamento({ valor: -10 })).toThrow('Valor deve ser maior que zero');
    });
  });

  describe('confirmar', () => {
    it('transitions from PENDENTE to CONFIRMADO and sets dataPagamento', () => {
      const updated = makePagamento().confirmar();
      expect(updated.status).toBe('CONFIRMADO');
      expect(updated.dataPagamento).toBeInstanceOf(Date);
    });

    it('returns a new instance (immutability)', () => {
      const p = makePagamento();
      const updated = p.confirmar();
      expect(updated).not.toBe(p);
      expect(p.status).toBe('PENDENTE');
    });

    it('throws when already CONFIRMADO', () => {
      expect(() => makePagamento().confirmar().confirmar()).toThrow('Pagamento já foi confirmado');
    });

    it('throws when CANCELADO', () => {
      expect(() => makePagamento().cancelar().confirmar()).toThrow('Pagamento cancelado não pode ser confirmado');
    });
  });

  describe('cancelar', () => {
    it('transitions from PENDENTE to CANCELADO', () => {
      const updated = makePagamento().cancelar();
      expect(updated.status).toBe('CANCELADO');
    });

    it('returns a new instance (immutability)', () => {
      const p = makePagamento();
      const updated = p.cancelar();
      expect(updated).not.toBe(p);
      expect(p.status).toBe('PENDENTE');
    });

    it('throws when already CANCELADO', () => {
      expect(() => makePagamento().cancelar().cancelar()).toThrow('Pagamento já está cancelado');
    });

    it('throws when CONFIRMADO', () => {
      expect(() => makePagamento().confirmar().cancelar()).toThrow('Pagamento confirmado não pode ser cancelado');
    });
  });
});
