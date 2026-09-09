/**
 * Cria a tabela `veiculos`.
 *
 * Desvio documentado: `cor`, `chassi`, `renavam` e `observacoes` foram adicionados
 * além do conjunto mínimo de docs/architecture/data-model.md — o `Veiculo` do
 * domínio (`veiculo.entity.ts`) já os expõe hoje via Mongo e removê-los causaria
 * perda de dados na migração. `chassi` é UNIQUE mas nullable (equivalente ao
 * índice `sparse: true` do schema Mongo — Postgres já permite múltiplos NULLs
 * em coluna UNIQUE). `atualizado_em` é bookkeeping de infraestrutura, sem
 * equivalente no domínio (que só tem `criadoEm`).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('veiculos', {
    id: { type: 'uuid', primaryKey: true },
    cliente_id: {
      type: 'uuid',
      notNull: true,
      references: 'clientes',
      onDelete: 'RESTRICT',
    },
    placa: { type: 'varchar(7)', notNull: true },
    marca: { type: 'varchar(80)', notNull: true },
    modelo: { type: 'varchar(80)', notNull: true },
    ano: { type: 'integer', notNull: true },
    quilometragem: { type: 'integer', notNull: true, default: 0 },
    cor: { type: 'varchar(40)' },
    chassi: { type: 'varchar(30)' },
    renavam: { type: 'varchar(20)' },
    observacoes: { type: 'text' },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    atualizado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('veiculos', 'veiculos_placa_unique', { unique: 'placa' });
  pgm.addConstraint('veiculos', 'veiculos_chassi_unique', { unique: 'chassi' });
  pgm.createIndex('veiculos', 'cliente_id');
};

exports.down = (pgm) => {
  pgm.dropTable('veiculos');
};
