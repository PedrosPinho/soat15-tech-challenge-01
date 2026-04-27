import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors/domain.error';
import { CpfCnpj } from '@domain/value-objects/cpf-cnpj.vo';
import { Endereco, EnderecoProps } from '@domain/value-objects/endereco.vo';

export type TipoCliente = 'PESSOA_FISICA' | 'PESSOA_JURIDICA';

export interface ClienteProps {
  id?: string;
  nome: string;
  cpfCnpj: string;
  tipo: TipoCliente;
  telefone: string;
  email: string;
  endereco: EnderecoProps;
  dataCadastro?: Date;
  ativo?: boolean;
}

export class Cliente {
  public readonly cpfCnpj: CpfCnpj;
  public readonly endereco: Endereco;

  private constructor(
    public readonly id: string,
    public readonly nome: string,
    cpfCnpj: CpfCnpj,
    public readonly tipo: TipoCliente,
    public readonly telefone: string,
    public readonly email: string,
    endereco: Endereco,
    public readonly dataCadastro: Date,
    public readonly ativo: boolean,
  ) {
    this.cpfCnpj = cpfCnpj;
    this.endereco = endereco;
  }

  static create(props: ClienteProps): Cliente {
    const cpfCnpj = CpfCnpj.create(props.cpfCnpj);
    const endereco = Endereco.create(props.endereco);
    Cliente.validate(props.nome, props.email, props.telefone, props.tipo, cpfCnpj);
    return new Cliente(
      props.id ?? uuidv4(),
      props.nome,
      cpfCnpj,
      props.tipo,
      props.telefone,
      props.email,
      endereco,
      props.dataCadastro ?? new Date(),
      props.ativo ?? true,
    );
  }

  atualizarContato(telefone: string, email: string): Cliente {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('Email inválido');
    }
    return new Cliente(
      this.id, this.nome, this.cpfCnpj, this.tipo,
      telefone, email, this.endereco, this.dataCadastro, this.ativo,
    );
  }

  desativar(): Cliente {
    return new Cliente(
      this.id, this.nome, this.cpfCnpj, this.tipo,
      this.telefone, this.email, this.endereco, this.dataCadastro, false,
    );
  }

  private static validate(
    nome: string,
    email: string,
    telefone: string,
    tipo: TipoCliente,
    cpfCnpj: CpfCnpj,
  ): void {
    if (nome.length < 3) throw new ValidationError('Nome deve ter pelo menos 3 caracteres');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Email inválido');
    if (!telefone.trim()) throw new ValidationError('Telefone é obrigatório');
    if (tipo === 'PESSOA_FISICA' && cpfCnpj.tipo !== 'CPF') {
      throw new ValidationError('Pessoa Física deve usar CPF');
    }
    if (tipo === 'PESSOA_JURIDICA' && cpfCnpj.tipo !== 'CNPJ') {
      throw new ValidationError('Pessoa Jurídica deve usar CNPJ');
    }
  }
}
