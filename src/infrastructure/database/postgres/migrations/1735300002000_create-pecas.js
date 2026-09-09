/**
 * Cria a tabela `pecas`, incluindo o índice GIN de busca textual em português
 * que substitui o índice `$text` do Mongo (ver `PecaModel` / `peca.schema.ts`).
 *
 * Desvio documentado: `preco_compra`, `nivel_minimo`, `nivel_maximo` e `ativo`
 * foram adicionados além do conjunto mínimo de docs/architecture/data-model.md
 * — são exigidos pelo construtor `Peca.create()` do domínio e pelo soft-delete
 * (`ativo = false`) já usado pelo repositório Mongo.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('categoria_peca', [
    'MOTOR',
    'TRANSMISSAO',
    'SUSPENSAO',
    'FREIOS',
    'ELETRICA',
    'FLUIDOS',
    'FILTROS',
    'OUTROS',
  ]);
  pgm.createType('unidade_medida', ['UNIDADE', 'LITRO', 'METRO', 'KG']);

  pgm.createTable('pecas', {
    id: { type: 'uuid', primaryKey: true },
    codigo: { type: 'varchar(50)', notNull: true },
    descricao: { type: 'varchar(200)', notNull: true },
    categoria: { type: 'categoria_peca', notNull: true },
    unidade_medida: { type: 'unidade_medida', notNull: true },
    preco_compra: { type: 'numeric(12,2)', notNull: true },
    preco_venda: { type: 'numeric(12,2)', notNull: true },
    nivel_minimo: { type: 'integer', notNull: true },
    nivel_maximo: { type: 'integer', notNull: true },
    ativo: { type: 'boolean', notNull: true, default: true },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    atualizado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('pecas', 'pecas_codigo_unique', { unique: 'codigo' });
  pgm.createIndex('pecas', 'categoria');

  pgm.sql(
    "CREATE INDEX pecas_descricao_gin_idx ON pecas USING gin (to_tsvector('portuguese', descricao))",
  );
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS pecas_descricao_gin_idx');
  pgm.dropTable('pecas');
  pgm.dropType('unidade_medida');
  pgm.dropType('categoria_peca');
};
