import { Pool } from 'pg';
import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository';
import { getPool } from '../pool';
import { UserRow, toDomainUser } from '../mappers/user.mapper';

export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(user: User): Promise<void> {
    await this.pool.query(
      `INSERT INTO usuarios (id, email, senha_hash, nome, ativo, criado_em)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [user.id, user.email.toLowerCase(), user.senhaHash, user.nome, user.ativo, user.criadoEm],
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM usuarios WHERE email = $1', [
      email.toLowerCase(),
    ]);
    return rows[0] ? toDomainUser(rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM usuarios WHERE id = $1', [id]);
    return rows[0] ? toDomainUser(rows[0]) : null;
  }
}
