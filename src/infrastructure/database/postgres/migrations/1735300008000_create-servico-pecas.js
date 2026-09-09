/**
 * Cria `servico_pecas` — nível 3 da árvore (equivalente ao array embutido
 * `pecasUtilizadas` de cada serviço). `preco_unitario` é o preço histórico no
 * momento em que a peça foi usada, não o `preco_venda` atual de `pecas` — por
 * isso não há coluna derivada, só a FK para referência.
 *
 * `UNIQUE (servico_os_id, peca_id)` reforça no banco a mesma regra que
 * `Servico.adicionarPeca()` já garante em memória (`ConflictError('Peça já
 * adicionada ao serviço')`).
 *
 * Desvio documentado: `descricao` foi adicionada — é um snapshot opcional que
 * `PecaServico` (servico.entity.ts) já expõe e que o ER de
 * docs/architecture/data-model.md não lista.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('servico_pecas', {
    id: { type: 'uuid', primaryKey: true },
    servico_os_id: {
      type: 'uuid',
      notNull: true,
      references: 'servicos_os',
      onDelete: 'CASCADE',
    },
    peca_id: { type: 'uuid', notNull: true, references: 'pecas', onDelete: 'RESTRICT' },
    descricao: { type: 'varchar(200)' },
    quantidade: { type: 'integer', notNull: true },
    preco_unitario: { type: 'numeric(12,2)', notNull: true },
  });

  pgm.addConstraint('servico_pecas', 'servico_pecas_servico_peca_unique', {
    unique: ['servico_os_id', 'peca_id'],
  });
  pgm.createIndex('servico_pecas', 'servico_os_id');
};

exports.down = (pgm) => {
  pgm.dropTable('servico_pecas');
};
