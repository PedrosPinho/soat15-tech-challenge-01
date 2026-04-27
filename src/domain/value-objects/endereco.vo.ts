import { ValidationError } from '@shared/errors/domain.error';

export interface EnderecoProps {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export class Endereco {
  public readonly logradouro: string;
  public readonly numero: string;
  public readonly complemento: string | undefined;
  public readonly bairro: string;
  public readonly cidade: string;
  public readonly estado: string;
  public readonly cep: string;

  private constructor(props: EnderecoProps) {
    this.logradouro = props.logradouro;
    this.numero = props.numero;
    this.complemento = props.complemento;
    this.bairro = props.bairro;
    this.cidade = props.cidade;
    this.estado = props.estado;
    this.cep = props.cep;
    Object.freeze(this);
  }

  static create(props: EnderecoProps): Endereco {
    const cep = props.cep.replace(/\D/g, '');
    Endereco.validate({ ...props, cep });
    return new Endereco({ ...props, cep });
  }

  private static validate(props: EnderecoProps & { cep: string }): void {
    if (!props.logradouro.trim()) throw new ValidationError('Logradouro é obrigatório');
    if (!props.bairro.trim()) throw new ValidationError('Bairro é obrigatório');
    if (!props.cidade.trim()) throw new ValidationError('Cidade é obrigatória');
    if (props.estado.length !== 2) throw new ValidationError('Estado deve ter 2 caracteres');
    if (!/^\d{8}$/.test(props.cep)) throw new ValidationError('CEP deve ter 8 dígitos numéricos');
  }

  equals(other: Endereco): boolean {
    return (
      this.logradouro === other.logradouro &&
      this.numero === other.numero &&
      this.complemento === other.complemento &&
      this.bairro === other.bairro &&
      this.cidade === other.cidade &&
      this.estado === other.estado &&
      this.cep === other.cep
    );
  }
}
