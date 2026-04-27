import { Endereco } from '@domain/value-objects/endereco.vo';
import { ValidationError } from '@shared/errors/domain.error';

describe('Endereco Value Object', () => {
  const validProps = {
    logradouro: 'Rua das Flores',
    numero: '123',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234567',
  };

  it('should create valid Endereco', () => {
    const endereco = Endereco.create(validProps);
    expect(endereco.logradouro).toBe('Rua das Flores');
    expect(endereco.cidade).toBe('São Paulo');
    expect(endereco.estado).toBe('SP');
    expect(endereco.cep).toBe('01234567');
  });

  it('should accept optional complemento', () => {
    const endereco = Endereco.create({ ...validProps, complemento: 'Apto 10' });
    expect(endereco.complemento).toBe('Apto 10');
  });

  it('should default complemento to undefined when not provided', () => {
    const endereco = Endereco.create(validProps);
    expect(endereco.complemento).toBeUndefined();
  });

  it('should throw when logradouro is empty', () => {
    expect(() => Endereco.create({ ...validProps, logradouro: '' })).toThrow(ValidationError);
  });

  it('should throw when cidade is empty', () => {
    expect(() => Endereco.create({ ...validProps, cidade: '' })).toThrow(ValidationError);
  });

  it('should throw when estado is not 2 chars', () => {
    expect(() => Endereco.create({ ...validProps, estado: 'SAO' })).toThrow(ValidationError);
    expect(() => Endereco.create({ ...validProps, estado: 'S' })).toThrow(ValidationError);
  });

  it('should throw when cep is not 8 digits', () => {
    expect(() => Endereco.create({ ...validProps, cep: '1234567' })).toThrow(ValidationError);
    expect(() => Endereco.create({ ...validProps, cep: '123456789' })).toThrow(ValidationError);
    expect(() => Endereco.create({ ...validProps, cep: 'abcdefgh' })).toThrow(ValidationError);
  });

  it('should strip CEP formatting', () => {
    const endereco = Endereco.create({ ...validProps, cep: '01234-567' });
    expect(endereco.cep).toBe('01234567');
  });

  it('should be immutable (value object)', () => {
    const endereco = Endereco.create(validProps);
    expect(Object.isFrozen(endereco)).toBe(true);
  });

  it('should be equal when same values', () => {
    const a = Endereco.create(validProps);
    const b = Endereco.create(validProps);
    expect(a.equals(b)).toBe(true);
  });

  it('should not be equal when different cidade', () => {
    const a = Endereco.create(validProps);
    const b = Endereco.create({ ...validProps, cidade: 'Rio de Janeiro' });
    expect(a.equals(b)).toBe(false);
  });
});
