import { CpfCnpj } from '@domain/value-objects/cpf-cnpj.vo';
import { ValidationError } from '@shared/errors/domain.error';

describe('CpfCnpj Value Object', () => {
  describe('CPF', () => {
    const VALID_CPF = '52998224725';
    const VALID_CPF_FORMATTED = '529.982.247-25';

    it('should create valid CPF from raw digits', () => {
      const cpf = CpfCnpj.create(VALID_CPF);
      expect(cpf.value).toBe(VALID_CPF);
      expect(cpf.tipo).toBe('CPF');
    });

    it('should strip formatting and create from formatted CPF', () => {
      const cpf = CpfCnpj.create(VALID_CPF_FORMATTED);
      expect(cpf.value).toBe(VALID_CPF);
    });

    it('should return formatted CPF with dots and dash', () => {
      const cpf = CpfCnpj.create(VALID_CPF);
      expect(cpf.formatted).toBe(VALID_CPF_FORMATTED);
    });

    it('should throw for CPF with invalid checksum', () => {
      expect(() => CpfCnpj.create('12345678900')).toThrow(ValidationError);
      expect(() => CpfCnpj.create('12345678900')).toThrow('CPF inválido');
    });

    it('should throw for CPF with all same digits', () => {
      expect(() => CpfCnpj.create('11111111111')).toThrow(ValidationError);
    });

    it('should throw for CPF with wrong length', () => {
      expect(() => CpfCnpj.create('1234567890')).toThrow(ValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => CpfCnpj.create('')).toThrow(ValidationError);
    });
  });

  describe('CNPJ', () => {
    const VALID_CNPJ = '11222333000181';
    const VALID_CNPJ_FORMATTED = '11.222.333/0001-81';

    it('should create valid CNPJ from raw digits', () => {
      const cnpj = CpfCnpj.create(VALID_CNPJ);
      expect(cnpj.value).toBe(VALID_CNPJ);
      expect(cnpj.tipo).toBe('CNPJ');
    });

    it('should strip formatting and create from formatted CNPJ', () => {
      const cnpj = CpfCnpj.create(VALID_CNPJ_FORMATTED);
      expect(cnpj.value).toBe(VALID_CNPJ);
    });

    it('should return formatted CNPJ with dots, slash and dash', () => {
      const cnpj = CpfCnpj.create(VALID_CNPJ);
      expect(cnpj.formatted).toBe(VALID_CNPJ_FORMATTED);
    });

    it('should throw for CNPJ with invalid checksum', () => {
      expect(() => CpfCnpj.create('11222333000100')).toThrow(ValidationError);
      expect(() => CpfCnpj.create('11222333000100')).toThrow('CNPJ inválido');
    });

    it('should throw for CNPJ with all same digits', () => {
      expect(() => CpfCnpj.create('11111111111111')).toThrow(ValidationError);
    });
  });

  describe('equals', () => {
    it('should be equal when same value', () => {
      const a = CpfCnpj.create('52998224725');
      const b = CpfCnpj.create('529.982.247-25');
      expect(a.equals(b)).toBe(true);
    });

    it('should not be equal when different values', () => {
      const a = CpfCnpj.create('52998224725');
      const b = CpfCnpj.create('11144477735');
      expect(a.equals(b)).toBe(false);
    });
  });
});
