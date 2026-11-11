/**
 * Estado persistido da Saga orquestrada (ADR-009). `versao` implementa o lock
 * otimista: a atualização só vale se a versão lida ainda for a armazenada.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('status_saga', [
    'EM_ANDAMENTO',
    'COMPENSANDO',
    'CONCLUIDA',
    'COMPENSADA',
    'FALHA_COMPENSACAO',
  ]);

  pgm.createTable('saga_instancias', {
    id: { type: 'uuid', primaryKey: true },
    ordem_servico_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'ordens_servico',
      onDelete: 'RESTRICT',
    },
    passo_atual: { type: 'varchar(40)', notNull: true },
    status: { type: 'status_saga', notNull: true, default: 'EM_ANDAMENTO' },
    dados: { type: 'jsonb', notNull: true, default: pgm.func(`'{}'::jsonb`) },
    versao: { type: 'integer', notNull: true, default: 1 },
    expira_em: { type: 'timestamptz' },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    atualizado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  // Sweeper de timeout: só sagas ativas com prazo.
  pgm.sql(
    `CREATE INDEX saga_instancias_expira_em_idx ON saga_instancias (expira_em)
       WHERE expira_em IS NOT NULL AND status IN ('EM_ANDAMENTO','COMPENSANDO')`,
  );

  pgm.createTable('saga_passos_log', {
    id: { type: 'bigserial', primaryKey: true },
    saga_id: { type: 'uuid', notNull: true, references: 'saga_instancias', onDelete: 'CASCADE' },
    passo: { type: 'varchar(40)', notNull: true },
    acao: { type: 'varchar(80)', notNull: true },
    resultado: { type: 'varchar(12)', notNull: true },
    mensagem_id: { type: 'uuid' },
    detalhe: { type: 'text' },
    ocorrido_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('saga_passos_log', ['saga_id', 'id']);
};

exports.down = (pgm) => {
  pgm.dropTable('saga_passos_log');
  pgm.dropTable('saga_instancias');
  pgm.dropType('status_saga');
};
