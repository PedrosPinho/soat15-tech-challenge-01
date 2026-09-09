/**
 * Cria a tabela `usuarios` (usuários internos da oficina — login e-mail/senha,
 * distintos de `clientes`). Corresponde 1:1 ao `User` do domínio.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('usuarios', {
    id: { type: 'uuid', primaryKey: true },
    email: { type: 'varchar(200)', notNull: true },
    senha_hash: { type: 'varchar(200)', notNull: true },
    nome: { type: 'varchar(200)', notNull: true },
    ativo: { type: 'boolean', notNull: true, default: true },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('usuarios', 'usuarios_email_unique', { unique: 'email' });
};

exports.down = (pgm) => {
  pgm.dropTable('usuarios');
};
