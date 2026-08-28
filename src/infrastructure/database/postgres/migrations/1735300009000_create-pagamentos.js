/**
 * Cria `pagamentos` — coleção flat no Mongo, tabela flat aqui também (não é
 * filha embutida de `ordens_servico`). O índice único parcial
 * `pagamentos_confirmado_unico_por_os` substitui a flag booleana
 * `ordens_servico.tem_pagamento` como fonte de verdade de "no máximo um
 * pagamento CONFIRMADO por OS": a flag continua existindo para leitura rápida,
 * mas quem impede a segunda confirmação é o banco, não o código de aplicação.
 *
 * Desvio documentado em relação a docs/architecture/data-model.md: `data_
 * pagamento` e `observacoes` foram adicionados — exigidos por
 * `Pagamento.confirmar()` e por `PagamentoProps.observacoes`.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('forma_pagamento', [
    'DINHEIRO',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'PIX',
    'TRANSFERENCIA',
  ]);
  pgm.createType('status_pagamento', ['PENDENTE', 'CONFIRMADO', 'CANCELADO']);

  pgm.createTable('pagamentos', {
    id: { type: 'uuid', primaryKey: true },
    ordem_servico_id: {
      type: 'uuid',
      notNull: true,
      references: 'ordens_servico',
      onDelete: 'RESTRICT',
    },
    valor: { type: 'numeric(12,2)', notNull: true },
    forma_pagamento: { type: 'forma_pagamento', notNull: true },
    status: { type: 'status_pagamento', notNull: true, default: 'PENDENTE' },
    data_pagamento: { type: 'timestamptz' },
    observacoes: { type: 'text' },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('pagamentos', 'ordem_servico_id');
  pgm.sql(
    `CREATE UNIQUE INDEX pagamentos_confirmado_unico_por_os
       ON pagamentos (ordem_servico_id) WHERE status = 'CONFIRMADO'`,
  );
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS pagamentos_confirmado_unico_por_os');
  pgm.dropTable('pagamentos');
  pgm.dropType('status_pagamento');
  pgm.dropType('forma_pagamento');
};
