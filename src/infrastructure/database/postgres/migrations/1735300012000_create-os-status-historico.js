/** Histórico de transições de status da OS (`GET /api/ordens-servico/:id/historico`). */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('os_status_historico', {
    id: { type: 'bigserial', primaryKey: true },
    ordem_servico_id: { type: 'uuid', notNull: true, references: 'ordens_servico', onDelete: 'CASCADE' },
    status_anterior: { type: 'status_os' },
    status_novo: { type: 'status_os', notNull: true },
    motivo: { type: 'text' },
    ocorrido_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('os_status_historico', ['ordem_servico_id', 'ocorrido_em']);
};

exports.down = (pgm) => {
  pgm.dropTable('os_status_historico');
};
