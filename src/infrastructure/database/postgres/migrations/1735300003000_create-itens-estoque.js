/**
 * Cria a tabela `itens_estoque`, com a invariante de não-negatividade reforçada
 * por CHECK constraint (hoje garantida apenas em `ItemEstoque.reservar()`/
 * `utilizar()`, no domínio).
 *
 * Desvio documentado: `quantidade_maxima` foi adicionado (data-model.md só lista
 * `quantidade_minima`) — o domínio (`nivelMaximo`) e a validação de
 * `ItemEstoque.create()` (`nivelMaximo > nivelMinimo`) exigem os dois limites.
 * `criado_em` também foi incluído pelo mesmo motivo (`ItemEstoque.criadoEm`).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('itens_estoque', {
    id: { type: 'uuid', primaryKey: true },
    peca_id: {
      type: 'uuid',
      notNull: true,
      references: 'pecas',
      onDelete: 'RESTRICT',
    },
    quantidade_disponivel: { type: 'integer', notNull: true, default: 0 },
    quantidade_reservada: { type: 'integer', notNull: true, default: 0 },
    quantidade_minima: { type: 'integer', notNull: true },
    quantidade_maxima: { type: 'integer', notNull: true },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    atualizado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('itens_estoque', 'itens_estoque_peca_id_unique', { unique: 'peca_id' });
  pgm.addConstraint(
    'itens_estoque',
    'itens_estoque_quantidades_nao_negativas',
    'CHECK (quantidade_disponivel >= 0 AND quantidade_reservada >= 0)',
  );
};

exports.down = (pgm) => {
  pgm.dropTable('itens_estoque');
};
