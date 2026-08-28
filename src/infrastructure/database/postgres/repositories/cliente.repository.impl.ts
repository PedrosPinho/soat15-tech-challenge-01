import { Pool } from 'pg';
import { Cliente } from '@domain/entities/cliente.entity';
import { IClienteRepository, ListClientesResult } from '@domain/repositories/cliente.repository';
import { getPool } from '../pool';
import { ClienteRow, toDomainCliente } from '../mappers/cliente.mapper';

export class PostgresClienteRepository implements IClienteRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(cliente: Cliente): Promise<void> {
    await this.pool.query(
      `INSERT INTO clientes (
        id, cpf_cnpj, tipo, nome, email, telefone,
        logradouro, numero, complemento, bairro, cidade, uf, cep,
        ativo, criado_em
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        cliente.id,
        cliente.cpfCnpj.value,
        cliente.tipo,
        cliente.nome,
        cliente.email.toLowerCase(),
        cliente.telefone,
        cliente.endereco.logradouro,
        cliente.endereco.numero,
        cliente.endereco.complemento ?? null,
        cliente.endereco.bairro,
        cliente.endereco.cidade,
        cliente.endereco.estado,
        cliente.endereco.cep,
        cliente.ativo,
        cliente.dataCadastro,
      ],
    );
  }

  async findById(id: string): Promise<Cliente | null> {
    const { rows } = await this.pool.query<ClienteRow>('SELECT * FROM clientes WHERE id = $1', [
      id,
    ]);
    return rows[0] ? toDomainCliente(rows[0]) : null;
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null> {
    const { rows } = await this.pool.query<ClienteRow>(
      'SELECT * FROM clientes WHERE cpf_cnpj = $1',
      [cpfCnpj],
    );
    return rows[0] ? toDomainCliente(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Cliente | null> {
    const { rows } = await this.pool.query<ClienteRow>(
      'SELECT * FROM clientes WHERE email = $1',
      [email.toLowerCase()],
    );
    return rows[0] ? toDomainCliente(rows[0]) : null;
  }

  async list(page: number, limit: number): Promise<ListClientesResult> {
    const offset = (page - 1) * limit;
    const [{ rows }, countResult] = await Promise.all([
      this.pool.query<ClienteRow>(
        'SELECT * FROM clientes WHERE ativo = true ORDER BY nome ASC LIMIT $1 OFFSET $2',
        [limit, offset],
      ),
      this.pool.query<{ count: string }>('SELECT COUNT(*) FROM clientes WHERE ativo = true'),
    ]);
    return { clientes: rows.map(toDomainCliente), total: Number(countResult.rows[0].count) };
  }

  async update(cliente: Cliente): Promise<void> {
    await this.pool.query(
      `UPDATE clientes SET
        cpf_cnpj = $2, tipo = $3, nome = $4, email = $5, telefone = $6,
        logradouro = $7, numero = $8, complemento = $9, bairro = $10,
        cidade = $11, uf = $12, cep = $13, ativo = $14, atualizado_em = now()
       WHERE id = $1`,
      [
        cliente.id,
        cliente.cpfCnpj.value,
        cliente.tipo,
        cliente.nome,
        cliente.email.toLowerCase(),
        cliente.telefone,
        cliente.endereco.logradouro,
        cliente.endereco.numero,
        cliente.endereco.complemento ?? null,
        cliente.endereco.bairro,
        cliente.endereco.cidade,
        cliente.endereco.estado,
        cliente.endereco.cep,
        cliente.ativo,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE clientes SET ativo = false, atualizado_em = now() WHERE id = $1',
      [id],
    );
  }
}
