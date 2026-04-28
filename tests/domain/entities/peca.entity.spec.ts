import { Peca } from '@domain/entities/peca.entity';
import { ValidationError } from '@shared/errors/domain.error';

const validProps = {
  codigo: 'FLT-OL-001',
  descricao: 'Filtro de óleo esportivo',
  categoria: 'FILTROS' as const,
  precoCompra: 25.00,
  precoVenda: 45.00,
  unidadeMedida: 'UNIDADE' as const,
  nivelMinimo: 5,
  nivelMaximo: 50,
};

describe('Peca entity', () => {
  it('creates a valid Peça with all required fields', () => {
    const p = Peca.create(validProps);
    expect(p.id).toBeDefined();
    expect(p.codigo).toBe('FLT-OL-001');
    expect(p.descricao).toBe('Filtro de óleo esportivo');
    expect(p.categoria).toBe('FILTROS');
    expect(p.precoCompra).toBe(25.00);
    expect(p.precoVenda).toBe(45.00);
    expect(p.ativo).toBe(true);
  });

  it('accepts a provided id', () => {
    const p = Peca.create({ ...validProps, id: 'fixed-uuid' });
    expect(p.id).toBe('fixed-uuid');
  });

  describe('margemLucro', () => {
    it('calculates margin as (venda - compra) / compra * 100', () => {
      const p = Peca.create(validProps); // (45-25)/25*100 = 80%
      expect(p.margemLucro).toBeCloseTo(80, 2);
    });

    it('returns 0 when precoVenda equals precoCompra', () => {
      const p = Peca.create({ ...validProps, precoVenda: 25.00 });
      expect(p.margemLucro).toBe(0);
    });

    it('returns 0 when precoCompra is zero (no division by zero)', () => {
      const p = Peca.create({ ...validProps, precoCompra: 0, precoVenda: 0 });
      expect(p.margemLucro).toBe(0);
    });
  });

  describe('validation', () => {
    it('throws when descricao is less than 5 chars', () => {
      expect(() => Peca.create({ ...validProps, descricao: 'AB' })).toThrow(ValidationError);
    });

    it('throws when descricao is more than 200 chars', () => {
      expect(() => Peca.create({ ...validProps, descricao: 'A'.repeat(201) })).toThrow(ValidationError);
    });

    it('throws when codigo is empty', () => {
      expect(() => Peca.create({ ...validProps, codigo: '' })).toThrow(ValidationError);
    });

    it('throws when precoCompra is negative', () => {
      expect(() => Peca.create({ ...validProps, precoCompra: -1 })).toThrow(ValidationError);
    });

    it('throws when precoVenda is less than precoCompra', () => {
      expect(() => Peca.create({ ...validProps, precoVenda: 20.00 })).toThrow(ValidationError);
    });

    it('allows precoVenda equal to precoCompra (0% margin)', () => {
      expect(() => Peca.create({ ...validProps, precoVenda: 25.00 })).not.toThrow();
    });

    it('throws when nivelMinimo is negative', () => {
      expect(() => Peca.create({ ...validProps, nivelMinimo: -1 })).toThrow(ValidationError);
    });

    it('throws when nivelMaximo is not greater than nivelMinimo', () => {
      expect(() => Peca.create({ ...validProps, nivelMinimo: 10, nivelMaximo: 10 })).toThrow(ValidationError);
      expect(() => Peca.create({ ...validProps, nivelMinimo: 10, nivelMaximo: 5 })).toThrow(ValidationError);
    });
  });

  describe('atualizarPreco', () => {
    it('returns new instance with updated prices', () => {
      const p = Peca.create(validProps);
      const updated = p.atualizarPreco(30.00, 60.00);

      expect(updated.precoCompra).toBe(30.00);
      expect(updated.precoVenda).toBe(60.00);
      expect(updated.margemLucro).toBeCloseTo(100, 2);
      expect(updated).not.toBe(p);
      expect(p.precoCompra).toBe(25.00);
    });

    it('throws when new precoVenda is less than new precoCompra', () => {
      const p = Peca.create(validProps);
      expect(() => p.atualizarPreco(50.00, 40.00)).toThrow(ValidationError);
    });
  });

  describe('desativar', () => {
    it('returns inactive instance', () => {
      const p = Peca.create(validProps);
      const deactivated = p.desativar();
      expect(deactivated.ativo).toBe(false);
      expect(p.ativo).toBe(true);
    });

    it('is idempotent', () => {
      const p = Peca.create(validProps).desativar();
      expect(p.desativar().ativo).toBe(false);
    });
  });
});
