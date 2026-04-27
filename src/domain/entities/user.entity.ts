import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors/domain.error';

export interface UserProps {
  id?: string;
  nome: string;
  email: string;
  senhaHash: string;
  ativo?: boolean;
  criadoEm?: Date;
}

export class User {
  private constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly email: string,
    public readonly senhaHash: string,
    public readonly ativo: boolean,
    public readonly criadoEm: Date,
  ) {}

  private static validate(nome: string, email: string): void {
    if (nome.length < 3) throw new ValidationError('Nome must be at least 3 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Invalid email format');
  }

  static create(props: UserProps): User {
    User.validate(props.nome, props.email);
    return new User(
      props.id ?? uuidv4(),
      props.nome,
      props.email,
      props.senhaHash,
      props.ativo ?? true,
      props.criadoEm ?? new Date(),
    );
  }

  desativar(): User {
    return new User(this.id, this.nome, this.email, this.senhaHash, false, this.criadoEm);
  }
}
