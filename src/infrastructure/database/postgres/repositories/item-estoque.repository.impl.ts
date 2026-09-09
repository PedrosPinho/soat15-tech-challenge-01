import { Pool } from 'pg';
import { ItemEstoque } from '@domain/entities/item-estoque.entity';
import { IItemEstoqueRepository } from '@domain/repositories/item-estoque.repository';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';
import { getPool } from '../pool';
import { ItemEstoqueRow, toDomainItemEstoque } from '../mappers/item-estoque.mapper';

/**
 * Implementa `IItemEstoqueRepository` (mesma assinatura pública usada hoje pelo
 * `MongoItemEstoqueRepository` / `InventoryService`) e, além dela, expõe
 * `reservar`/`utilizar` como métodos extras da classe concreta.
 *
 * Por quê: `IItemEstoqueRepository.update()` recebe o `ItemEstoque` inteiro já
 * mutado em memória pelo `InventoryService` (que faz `findByPecaId` seguido de
 * `item.reservar(qtd)` e só então `repo.update(item)`). Fazer o `UPDATE` do
 * Postgres a partir desse valor final não evita a condição de corrida — duas
 * chamadas concorrentes partindo da mesma leitura calculariam o mesmo estado
 * final e uma sobrescreveria a outra (lost update), reintroduzindo exatamente
 * o problema que o plano da Fase 3 pede para evitar.
 *
 * `reservar`/`utilizar`, por outro lado, fazem a checagem de suficiência e a
 * escrita em uma única instrução condicional (`UPDATE ... WHERE quantidade_
 * disponivel >= $1`), sem round-trip de leitura antes — a mesma garantia que
 * o documento único do Mongo dava de graça. Ficam prontos para substituir o
 * fluxo read-then-write de `InventoryService.reservarEstoque`/`utilizarEstoque`
 * quando a fábrica de repositórios for trocada para Postgres (fora do escopo
 * desta tarefa, que não altera `src/main/factories/` nem `InventoryService`).
 */
export class PostgresItemEstoqueRepository implements IItemEstoqueRepository {
  constructor(private readonly pool: Pool = getPool()) {}

  async save(item: ItemEstoque): Promise<void> {
    await this.pool.query(
      `INSERT INTO itens_estoque (
        id, peca_id, quantidade_disponivel, quantidade_reservada,
        quantidade_minima, quantidade_maxima, criado_em, atualizado_em
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        item.id,
        item.pecaId,
        item.quantidadeDisponivel,
        item.quantidadeReservada,
        item.nivelMinimo,
        item.nivelMaximo,
        item.criadoEm,
        item.atualizadoEm,
      ],
    );
  }

  async findByPecaId(pecaId: string): Promise<ItemEstoque | null> {
    const { rows } = await this.pool.query<ItemEstoqueRow>(
      'SELECT * FROM itens_estoque WHERE peca_id = $1',
      [pecaId],
    );
    return rows[0] ? toDomainItemEstoque(rows[0]) : null;
  }

  async update(item: ItemEstoque): Promise<void> {
    await this.pool.query(
      `UPDATE itens_estoque SET
        quantidade_disponivel = $2, quantidade_reservada = $3,
        quantidade_minima = $4, quantidade_maxima = $5, atualizado_em = now()
       WHERE id = $1`,
      [
        item.id,
        item.quantidadeDisponivel,
        item.quantidadeReservada,
        item.nivelMinimo,
        item.nivelMaximo,
      ],
    );
  }

  async list(filter?: { abaixoMinimo?: boolean }): Promise<ItemEstoque[]> {
    const { rows } = await this.pool.query<ItemEstoqueRow>('SELECT * FROM itens_estoque');
    const items = rows.map(toDomainItemEstoque);

    if (filter?.abaixoMinimo) {
      return items.filter((item) => item.isAbaixoDoMinimo);
    }
    return items;
  }

  /**
   * Reserva `quantidade` unidades de forma atômica: uma única instrução
   * condicional decide se há estoque suficiente e já escreve o resultado,
   * sem SELECT prévio.
   */
  async reservar(pecaId: string, quantidade: number): Promise<ItemEstoque> {
    if (quantidade <= 0) throw new ValidationError('Quantidade deve ser maior que zero');

    const { rows } = await this.pool.query<ItemEstoqueRow>(
      `UPDATE itens_estoque
       SET quantidade_disponivel = quantidade_disponivel - $1,
           quantidade_reservada = quantidade_reservada + $1,
           atualizado_em = now()
       WHERE peca_id = $2 AND quantidade_disponivel >= $1
       RETURNING *`,
      [quantidade, pecaId],
    );

    if (rows[0]) return toDomainItemEstoque(rows[0]);
    await this.assertExists(pecaId);
    throw new ValidationError('Estoque insuficiente');
  }

  /**
   * Consome `quantidade` unidades já reservadas, também em uma única
   * instrução condicional.
   */
  async utilizar(pecaId: string, quantidade: number): Promise<ItemEstoque> {
    if (quantidade <= 0) throw new ValidationError('Quantidade deve ser maior que zero');

    const { rows } = await this.pool.query<ItemEstoqueRow>(
      `UPDATE itens_estoque
       SET quantidade_reservada = quantidade_reservada - $1,
           atualizado_em = now()
       WHERE peca_id = $2 AND quantidade_reservada >= $1
       RETURNING *`,
      [quantidade, pecaId],
    );

    if (rows[0]) return toDomainItemEstoque(rows[0]);
    await this.assertExists(pecaId);
    throw new ValidationError('Quantidade a utilizar excede o reservado');
  }

  private async assertExists(pecaId: string): Promise<void> {
    const existing = await this.findByPecaId(pecaId);
    if (!existing) throw new NotFoundError(`ItemEstoque não encontrado para a peça ${pecaId}`);
  }
}
