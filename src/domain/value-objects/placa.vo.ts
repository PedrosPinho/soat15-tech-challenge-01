import { ValidationError } from '@shared/errors/domain.error';

// Brazilian plate formats:
//   Old:      ABC-1234  (3 letters, 4 digits)
//   Mercosul: ABC1D23   (3 letters, 1 digit, 1 letter, 2 digits)
const OLD_FORMAT = /^[A-Z]{3}\d{4}$/;
const MERCOSUL_FORMAT = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export class Placa {
  private constructor(public readonly value: string) {}

  static create(raw: string): Placa {
    const normalized = raw.replace(/[-\s]/g, '').toUpperCase();

    if (normalized.length !== 7) {
      throw new ValidationError('Placa deve ter 7 caracteres (ex: ABC1234 ou ABC1D23)');
    }

    if (!OLD_FORMAT.test(normalized) && !MERCOSUL_FORMAT.test(normalized)) {
      throw new ValidationError(
        'Placa inválida. Use o formato antigo (ABC-1234) ou Mercosul (ABC1D23)',
      );
    }

    return new Placa(normalized);
  }

  get isMercosul(): boolean {
    return MERCOSUL_FORMAT.test(this.value);
  }

  get formatted(): string {
    if (this.isMercosul) return this.value;
    return `${this.value.slice(0, 3)}-${this.value.slice(3)}`;
  }

  equals(other: Placa): boolean {
    return this.value === other.value;
  }
}
