/**
 * Fase 4: novo status `AGUARDANDO_PAGAMENTO` (entre a aprovação do orçamento
 * e a execução), exigido pela Saga "Ciclo da OS". PostgreSQL ≥ 12 permite
 * `ALTER TYPE ... ADD VALUE` dentro de transação (o valor novo só não pode ser
 * *usado* na mesma transação — esta migration não o usa).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`ALTER TYPE status_os ADD VALUE IF NOT EXISTS 'AGUARDANDO_PAGAMENTO' AFTER 'AGUARDANDO_APROVACAO'`);
};

// PostgreSQL não remove valores de enum. O valor extra é inofensivo no down.
exports.down = () => {};
