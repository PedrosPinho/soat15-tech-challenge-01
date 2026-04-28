import { Veiculo } from '@domain/entities/veiculo.entity';
import { ValidationError } from '@shared/errors/domain.error';

const validProps = {
  clienteId: 'client-uuid-123',
  placa: 'ABC1D23',
  marca: 'Honda',
  modelo: 'Civic',
  ano: 2020,
  quilometragem: 50000,
};

describe('Veiculo entity', () => {
  it('creates a valid vehicle with Mercosul plate', () => {
    const v = Veiculo.create(validProps);
    expect(v.id).toBeDefined();
    expect(v.clienteId).toBe('client-uuid-123');
    expect(v.placa.value).toBe('ABC1D23');
    expect(v.marca).toBe('Honda');
    expect(v.modelo).toBe('Civic');
    expect(v.ano).toBe(2020);
    expect(v.quilometragem).toBe(50000);
  });

  it('creates a vehicle with old-format plate', () => {
    const v = Veiculo.create({ ...validProps, placa: 'XYZ-9876' });
    expect(v.placa.value).toBe('XYZ9876');
  });

  it('accepts a provided id', () => {
    const v = Veiculo.create({ ...validProps, id: 'fixed-uuid' });
    expect(v.id).toBe('fixed-uuid');
  });

  it('defaults quilometragem to 0 when not provided', () => {
    const v = Veiculo.create({ ...validProps, quilometragem: undefined });
    expect(v.quilometragem).toBe(0);
  });

  it('throws when marca is less than 2 chars', () => {
    expect(() => Veiculo.create({ ...validProps, marca: 'A' })).toThrow(ValidationError);
  });

  it('throws when modelo is less than 2 chars', () => {
    expect(() => Veiculo.create({ ...validProps, modelo: 'X' })).toThrow(ValidationError);
  });

  it('throws when ano is before 1900', () => {
    expect(() => Veiculo.create({ ...validProps, ano: 1899 })).toThrow(ValidationError);
  });

  it('throws when ano is in the future', () => {
    const futureYear = new Date().getFullYear() + 1;
    expect(() => Veiculo.create({ ...validProps, ano: futureYear })).toThrow(ValidationError);
  });

  it('throws when quilometragem is negative', () => {
    expect(() => Veiculo.create({ ...validProps, quilometragem: -1 })).toThrow(ValidationError);
  });

  describe('atualizarQuilometragem', () => {
    it('updates quilometragem with a higher value', () => {
      const v = Veiculo.create(validProps);
      const updated = v.atualizarQuilometragem(60000);
      expect(updated.quilometragem).toBe(60000);
      expect(updated.id).toBe(v.id);
    });

    it('throws when new quilometragem is less than current', () => {
      const v = Veiculo.create(validProps);
      expect(() => v.atualizarQuilometragem(40000)).toThrow(ValidationError);
    });

    it('throws when new quilometragem equals current', () => {
      const v = Veiculo.create(validProps);
      expect(() => v.atualizarQuilometragem(50000)).toThrow(ValidationError);
    });

    it('returns a new immutable instance', () => {
      const v = Veiculo.create(validProps);
      const updated = v.atualizarQuilometragem(60000);
      expect(updated).not.toBe(v);
      expect(v.quilometragem).toBe(50000);
    });
  });

  it('stores optional fields when provided', () => {
    const v = Veiculo.create({
      ...validProps,
      cor: 'Prata',
      chassi: '9BWZZZ377VT004251',
      renavam: '12345678901',
      observacoes: 'Veículo bem conservado',
    });
    expect(v.cor).toBe('Prata');
    expect(v.chassi).toBe('9BWZZZ377VT004251');
    expect(v.renavam).toBe('12345678901');
    expect(v.observacoes).toBe('Veículo bem conservado');
  });
});
