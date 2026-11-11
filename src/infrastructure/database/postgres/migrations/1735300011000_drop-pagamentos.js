/**
 * Fase 4: pagamentos passam a pertencer ao Billing Service (ADR-008). O banco
 * é recriado a cada sessão do Learner Lab, então não há dado a migrar.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS pagamentos_confirmado_unico_por_os');
  pgm.dropTable('pagamentos', { ifExists: true });
  pgm.dropType('status_pagamento', { ifExists: true });
  pgm.dropType('forma_pagamento', { ifExists: true });
};

exports.down = (pgm) => {
  pgm.createType('forma_pagamento', ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA']);
  pgm.createType('status_pagamento', ['PENDENTE', 'CONFIRMADO', 'CANCELADO']);
  pgm.createTable('pagamentos', {
    id: { type: 'uuid', primaryKey: true },
    ordem_servico_id: { type: 'uuid', notNull: true, references: 'ordens_servico', onDelete: 'RESTRICT' },
    valor: { type: 'numeric(12,2)', notNull: true },
    forma_pagamento: { type: 'forma_pagamento', notNull: true },
    status: { type: 'status_pagamento', notNull: true, default: 'PENDENTE' },
    data_pagamento: { type: 'timestamptz' },
    observacoes: { type: 'text' },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('pagamentos', 'ordem_servico_id');
};
