import { User } from '@domain/entities/user.entity';

export interface UserRow {
  id: string;
  email: string;
  senha_hash: string;
  nome: string;
  ativo: boolean;
  criado_em: Date;
}

export const toDomainUser = (row: UserRow): User =>
  User.create({
    id: row.id,
    nome: row.nome,
    email: row.email,
    senhaHash: row.senha_hash,
    ativo: row.ativo,
    criadoEm: row.criado_em,
  });
