import { Placa } from '@domain/value-objects/placa.vo';
import { ValidationError } from '@shared/errors/domain.error';

describe('Placa value object', () => {
  describe('old format (ABC-1234)', () => {
    it('accepts valid old format without hyphen', () => {
      const placa = Placa.create('ABC1234');
      expect(placa.value).toBe('ABC1234');
    });

    it('accepts valid old format with hyphen and normalizes', () => {
      const placa = Placa.create('ABC-1234');
      expect(placa.value).toBe('ABC1234');
    });

    it('uppercases lowercase letters', () => {
      const placa = Placa.create('abc1234');
      expect(placa.value).toBe('ABC1234');
    });
  });

  describe('Mercosul format (ABC1D23)', () => {
    it('accepts valid Mercosul format', () => {
      const placa = Placa.create('ABC1D23');
      expect(placa.value).toBe('ABC1D23');
    });

    it('accepts lowercase Mercosul and uppercases', () => {
      const placa = Placa.create('abc1d23');
      expect(placa.value).toBe('ABC1D23');
    });
  });

  describe('formatted getter', () => {
    it('formats old format as ABC-1234', () => {
      const placa = Placa.create('ABC1234');
      expect(placa.formatted).toBe('ABC-1234');
    });

    it('formats Mercosul as ABC1D23 (no hyphen)', () => {
      const placa = Placa.create('ABC1D23');
      expect(placa.formatted).toBe('ABC1D23');
    });
  });

  describe('validation', () => {
    it('throws for empty string', () => {
      expect(() => Placa.create('')).toThrow(ValidationError);
    });

    it('throws for wrong length', () => {
      expect(() => Placa.create('AB1234')).toThrow(ValidationError);
      expect(() => Placa.create('ABCD1234')).toThrow(ValidationError);
    });

    it('throws for all-letter plate', () => {
      expect(() => Placa.create('ABCDEFG')).toThrow(ValidationError);
    });

    it('throws for all-digit plate', () => {
      expect(() => Placa.create('1234567')).toThrow(ValidationError);
    });

    it('throws for plate that matches neither old nor Mercosul format', () => {
      // ABC12D3 — 2 digits before the letter, not 1 → invalid Mercosul; not all-digit suffix → invalid old
      expect(() => Placa.create('ABC12D3')).toThrow(ValidationError);
    });
  });

  describe('equals', () => {
    it('returns true for same plate', () => {
      expect(Placa.create('ABC1234').equals(Placa.create('ABC1234'))).toBe(true);
    });

    it('returns false for different plates', () => {
      expect(Placa.create('ABC1234').equals(Placa.create('ABC1D23'))).toBe(false);
    });

    it('treats hyphen-stripped and raw as equal', () => {
      expect(Placa.create('ABC-1234').equals(Placa.create('ABC1234'))).toBe(true);
    });
  });
});
