import { NumeroOS } from '@domain/value-objects/numero-os.vo';

describe('NumeroOS value object', () => {
  describe('generate', () => {
    it('generates in OS-YYYYMMDD-#### format', () => {
      const date = new Date('2024-03-15T10:00:00Z');
      const numeroOS = NumeroOS.generate(date, 1);
      expect(numeroOS.value).toBe('OS-20240315-0001');
    });

    it('pads sequence to 4 digits', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      expect(NumeroOS.generate(date, 42).value).toBe('OS-20240101-0042');
      expect(NumeroOS.generate(date, 999).value).toBe('OS-20240101-0999');
      expect(NumeroOS.generate(date, 1000).value).toBe('OS-20240101-1000');
    });

    it('produces unique values for different dates', () => {
      const date1 = new Date('2024-03-15T00:00:00Z');
      const date2 = new Date('2024-03-16T00:00:00Z');
      expect(NumeroOS.generate(date1, 1).value).not.toBe(NumeroOS.generate(date2, 1).value);
    });

    it('produces unique values for different sequences on same date', () => {
      const date = new Date('2024-03-15T00:00:00Z');
      expect(NumeroOS.generate(date, 1).value).not.toBe(NumeroOS.generate(date, 2).value);
    });
  });

  describe('parse', () => {
    it('parses a valid numero OS string', () => {
      const numero = NumeroOS.parse('OS-20240315-0001');
      expect(numero.value).toBe('OS-20240315-0001');
    });

    it('throws for invalid format', () => {
      expect(() => NumeroOS.parse('OS20240315-0001')).toThrow('Formato de número de OS inválido');
      expect(() => NumeroOS.parse('OS-2024031-0001')).toThrow('Formato de número de OS inválido');
      expect(() => NumeroOS.parse('OS-20240315-001')).toThrow('Formato de número de OS inválido');
      expect(() => NumeroOS.parse('')).toThrow('Formato de número de OS inválido');
    });
  });

  describe('equals', () => {
    it('returns true for same value', () => {
      const a = NumeroOS.parse('OS-20240315-0001');
      const b = NumeroOS.parse('OS-20240315-0001');
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different values', () => {
      const a = NumeroOS.parse('OS-20240315-0001');
      const b = NumeroOS.parse('OS-20240315-0002');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns the string value', () => {
      const numero = NumeroOS.parse('OS-20240315-0042');
      expect(numero.toString()).toBe('OS-20240315-0042');
    });
  });
});
