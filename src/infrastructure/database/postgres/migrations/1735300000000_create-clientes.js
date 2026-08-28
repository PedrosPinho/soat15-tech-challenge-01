/**
 * Cria a tabela `clientes`.
 *
 * Desvios documentados em relação a docs/architecture/data-model.md:
 * - `tipo` usa os valores literais do domínio (`PESSOA_FISICA`/`PESSOA_JURIDICA`),
 *   não a abreviação `PF`/`PJ` usada no diagrama Mermaid.
 * - `bairro` e `complemento` foram adicionados: o VO `Endereco` do domínio os exige
 *   e o diagrama ER (simplificado) não os lista.
 * - `atualizado_em` é uma coluna de bookkeeping da infraestrutura (o `Cliente` do
 *   domínio não tem esse campo); `criado_em` é onde `dataCadastro` é persistido.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('tipo_cliente', ['PESSOA_FISICA', 'PESSOA_JURIDICA']);

  pgm.createTable('clientes', {
    id: { type: 'uuid', primaryKey: true },
    cpf_cnpj: { type: 'varchar(14)', notNull: true },
    tipo: { type: 'tipo_cliente', notNull: true },
    nome: { type: 'varchar(200)', notNull: true },
    email: { type: 'varchar(200)', notNull: true },
    telefone: { type: 'varchar(20)', notNull: true },
    logradouro: { type: 'varchar(200)', notNull: true },
    numero: { type: 'varchar(20)', notNull: true },
    complemento: { type: 'varchar(200)' },
    bairro: { type: 'varchar(120)', notNull: true },
    cidade: { type: 'varchar(120)', notNull: true },
    uf: { type: 'varchar(2)', notNull: true },
    cep: { type: 'varchar(8)', notNull: true },
    ativo: { type: 'boolean', notNull: true, default: true },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    atualizado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('clientes', 'clientes_cpf_cnpj_unique', {
    unique: 'cpf_cnpj',
  });
  pgm.addConstraint('clientes', 'clientes_email_unique', {
    unique: 'email',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('clientes');
  pgm.dropType('tipo_cliente');
};
