/**
 * Cria `servicos_os` — nível 2 da árvore de `OrdemServico` (equivalente ao array
 * embutido `servicos` do documento Mongo). `ON DELETE CASCADE` em
 * `ordem_servico_id`: a entidade `OrdemServico` é imutável e `save()`/`update()`
 * sempre gravam a árvore inteira (DELETE + INSERT transacional dos filhos), então
 * remover a OS remove os serviços junto, sem órfãos.
 *
 * `ordem` preserva a posição original no array `servicos[]` (Postgres não garante
 * ordem de retorno sem `ORDER BY` explícito).
 *
 * Desvio documentado em relação a docs/architecture/data-model.md: `tempo_real_
 * minutos` e `observacoes` foram adicionados — exigidos por `Servico.concluir()`
 * e pelo campo `observacoes` de `ServicoProps`.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('status_servico', ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO']);

  pgm.createTable('servicos_os', {
    id: { type: 'uuid', primaryKey: true },
    ordem_servico_id: {
      type: 'uuid',
      notNull: true,
      references: 'ordens_servico',
      onDelete: 'CASCADE',
    },
    ordem: { type: 'integer', notNull: true },
    descricao: { type: 'varchar(200)', notNull: true },
    status: { type: 'status_servico', notNull: true, default: 'PENDENTE' },
    tempo_estimado_minutos: { type: 'integer', notNull: true },
    tempo_real_minutos: { type: 'integer' },
    valor_mao_de_obra: { type: 'numeric(12,2)', notNull: true },
    observacoes: { type: 'text' },
  });

  pgm.createIndex('servicos_os', 'ordem_servico_id');
};

exports.down = (pgm) => {
  pgm.dropTable('servicos_os');
  pgm.dropType('status_servico');
};
