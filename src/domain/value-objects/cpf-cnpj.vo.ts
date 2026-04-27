import { ValidationError } from '@shared/errors/domain.error';

export class CpfCnpj {
  private constructor(
    public readonly value: string,
    public readonly tipo: 'CPF' | 'CNPJ',
  ) {}

  static create(raw: string): CpfCnpj {
    const digits = raw.replace(/\D/g, '');

    if (digits.length === 11) {
      if (!CpfCnpj.validateCpf(digits)) throw new ValidationError('CPF inválido');
      return new CpfCnpj(digits, 'CPF');
    }

    if (digits.length === 14) {
      if (!CpfCnpj.validateCnpj(digits)) throw new ValidationError('CNPJ inválido');
      return new CpfCnpj(digits, 'CNPJ');
    }

    throw new ValidationError('CPF ou CNPJ inválido: deve ter 11 ou 14 dígitos');
  }

  get formatted(): string {
    if (this.tipo === 'CPF') {
      return this.value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return this.value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  equals(other: CpfCnpj): boolean {
    return this.value === other.value;
  }

  private static validateCpf(cpf: string): boolean {
    if (/^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cpf[9]) !== digit1) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    return parseInt(cpf[10]) === digit2;
  }

  private static validateCnpj(cnpj: string): boolean {
    if (/^(\d)\1+$/.test(cnpj)) return false;

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = weights1.reduce((acc, w, i) => acc + parseInt(cnpj[i]) * w, 0);
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (parseInt(cnpj[12]) !== digit1) return false;

    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = weights2.reduce((acc, w, i) => acc + parseInt(cnpj[i]) * w, 0);
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    return parseInt(cnpj[13]) === digit2;
  }
}
