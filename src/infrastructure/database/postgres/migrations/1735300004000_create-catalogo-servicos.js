/**
 * Cria a tabela `catalogo_servicos` — corresponde 1:1 ao modelo em
 * docs/architecture/data-model.md e ao `CatalogoServico` do domínio.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('catalogo_servicos', {
    id: { type: 'uuid', primaryKey: true },
    descricao: { type: 'varchar(200)', notNull: true },
    preco: { type: 'numeric(12,2)', notNull: true },
    tempo_estimado: { type: 'numeric(10,2)', notNull: true },
    ativo: { type: 'boolean', notNull: true, default: true },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    atualizado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('catalogo_servicos', 'ativo');
  pgm.sql(
    "CREATE INDEX catalogo_servicos_descricao_gin_idx ON catalogo_servicos USING gin (to_tsvector('portuguese', descricao))",
  );
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS catalogo_servicos_descricao_gin_idx');
  pgm.dropTable('catalogo_servicos');
};
