import { Pool } from 'pg';
import { Veiculo } from '@domain/entities/veiculo.entity';
import { IVeiculoRepository, ListVeiculosResult } from '@domain/repositories/veiculo.repository';
import { getPool } from '../pool';
import { VeiculoRow, toDomainVeiculo } from '../mappers/veiculo.mapper';

export class PostgresVeiculoRepository implements IVeiculoRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(veiculo: Veiculo): Promise<void> {
    await this.pool.query(
      `INSERT INTO veiculos (
        id, cliente_id, placa, marca, modelo, ano, quilometragem,
        cor, chassi, renavam, observacoes, criado_em
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        veiculo.id,
        veiculo.clienteId,
        veiculo.placa.value,
        veiculo.marca,
        veiculo.modelo,
        veiculo.ano,
        veiculo.quilometragem,
        veiculo.cor ?? null,
        veiculo.chassi ?? null,
        veiculo.renavam ?? null,
        veiculo.observacoes ?? null,
        veiculo.criadoEm,
      ],
    );
  }

  async findById(id: string): Promise<Veiculo | null> {
    const { rows } = await this.pool.query<VeiculoRow>('SELECT * FROM veiculos WHERE id = $1', [
      id,
    ]);
    return rows[0] ? toDomainVeiculo(rows[0]) : null;
  }

  async findByPlaca(placa: string): Promise<Veiculo | null> {
    const { rows } = await this.pool.query<VeiculoRow>(
      'SELECT * FROM veiculos WHERE placa = $1',
      [placa.toUpperCase()],
    );
    return rows[0] ? toDomainVeiculo(rows[0]) : null;
  }

  async findByClienteId(
    clienteId: string,
    page: number,
    limit: number,
  ): Promise<ListVeiculosResult> {
    const offset = (page - 1) * limit;
    const [{ rows }, countResult] = await Promise.all([
      this.pool.query<VeiculoRow>(
        'SELECT * FROM veiculos WHERE cliente_id = $1 ORDER BY criado_em DESC LIMIT $2 OFFSET $3',
        [clienteId, limit, offset],
      ),
      this.pool.query<{ count: string }>(
        'SELECT COUNT(*) FROM veiculos WHERE cliente_id = $1',
        [clienteId],
      ),
    ]);
    return { veiculos: rows.map(toDomainVeiculo), total: Number(countResult.rows[0].count) };
  }

  async update(veiculo: Veiculo): Promise<void> {
    await this.pool.query(
      `UPDATE veiculos SET
        cliente_id = $2, placa = $3, marca = $4, modelo = $5, ano = $6,
        quilometragem = $7, cor = $8, chassi = $9, renavam = $10,
        observacoes = $11, atualizado_em = now()
       WHERE id = $1`,
      [
        veiculo.id,
        veiculo.clienteId,
        veiculo.placa.value,
        veiculo.marca,
        veiculo.modelo,
        veiculo.ano,
        veiculo.quilometragem,
        veiculo.cor ?? null,
        veiculo.chassi ?? null,
        veiculo.renavam ?? null,
        veiculo.observacoes ?? null,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM veiculos WHERE id = $1', [id]);
  }
}
