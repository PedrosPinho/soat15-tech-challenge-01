import { Cliente } from '@domain/entities/cliente.entity';
import { ValidationError } from '@shared/errors/domain.error';

describe('Cliente Entity', () => {
  const validPFProps = {
    nome: 'João Silva',
    cpfCnpj: '52998224725',
    tipo: 'PESSOA_FISICA' as const,
    telefone: '11987654321',
    email: 'joao@email.com',
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234567',
    },
  };

  const validPJProps = {
    nome: 'Empresa Ltda',
    cpfCnpj: '11222333000181',
    tipo: 'PESSOA_JURIDICA' as const,
    telefone: '1133334444',
    email: 'empresa@email.com',
    endereco: {
      logradouro: 'Av Paulista',
      numero: '1000',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01310100',
    },
  };

  describe('create', () => {
    it('should create valid PESSOA_FISICA with CPF', () => {
      const cliente = Cliente.create(validPFProps);
      expect(cliente.id).toBeDefined();
      expect(cliente.nome).toBe('João Silva');
      expect(cliente.cpfCnpj.value).toBe('52998224725');
      expect(cliente.tipo).toBe('PESSOA_FISICA');
      expect(cliente.ativo).toBe(true);
      expect(cliente.dataCadastro).toBeInstanceOf(Date);
    });

    it('should create valid PESSOA_JURIDICA with CNPJ', () => {
      const cliente = Cliente.create(validPJProps);
      expect(cliente.cpfCnpj.tipo).toBe('CNPJ');
      expect(cliente.tipo).toBe('PESSOA_JURIDICA');
    });

    it('should use provided id when given', () => {
      const id = 'fixed-id-123';
      const cliente = Cliente.create({ ...validPFProps, id });
      expect(cliente.id).toBe(id);
    });

    it('should throw when nome is too short', () => {
      expect(() => Cliente.create({ ...validPFProps, nome: 'Jo' })).toThrow(ValidationError);
    });

    it('should throw when email is invalid', () => {
      expect(() => Cliente.create({ ...validPFProps, email: 'not-an-email' })).toThrow(ValidationError);
    });

    it('should throw when telefone is empty', () => {
      expect(() => Cliente.create({ ...validPFProps, telefone: '' })).toThrow(ValidationError);
    });

    it('should throw when PESSOA_FISICA uses CNPJ', () => {
      expect(() => Cliente.create({ ...validPFProps, cpfCnpj: '11222333000181' })).toThrow(ValidationError);
    });

    it('should throw when PESSOA_JURIDICA uses CPF', () => {
      expect(() => Cliente.create({ ...validPJProps, cpfCnpj: '52998224725' })).toThrow(ValidationError);
    });
  });

  describe('atualizarContato', () => {
    it('should return new Cliente with updated telefone and email', () => {
      const cliente = Cliente.create(validPFProps);
      const updated = cliente.atualizarContato('11999999999', 'novo@email.com');
      expect(updated.telefone).toBe('11999999999');
      expect(updated.email).toBe('novo@email.com');
      expect(updated.id).toBe(cliente.id);
    });

    it('should throw when new email is invalid', () => {
      const cliente = Cliente.create(validPFProps);
      expect(() => cliente.atualizarContato('11999999999', 'bad-email')).toThrow(ValidationError);
    });
  });

  describe('desativar', () => {
    it('should return new Cliente with ativo=false', () => {
      const cliente = Cliente.create(validPFProps);
      const deactivated = cliente.desativar();
      expect(deactivated.ativo).toBe(false);
      expect(deactivated.id).toBe(cliente.id);
      expect(cliente.ativo).toBe(true);
    });
  });
});
