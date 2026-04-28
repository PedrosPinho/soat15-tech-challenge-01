import { ValidationError } from '@shared/errors/domain.error';

const FORMAT = /^OS-\d{8}-\d{4}$/;

export class NumeroOS {
  private constructor(public readonly value: string) {}

  static generate(date: Date, sequence: number): NumeroOS {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const seq = String(sequence).padStart(4, '0');
    return new NumeroOS(`OS-${y}${m}${d}-${seq}`);
  }

  static parse(value: string): NumeroOS {
    if (!FORMAT.test(value)) {
      throw new ValidationError('Formato de número de OS inválido. Use: OS-YYYYMMDD-####');
    }
    return new NumeroOS(value);
  }

  equals(other: NumeroOS): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
