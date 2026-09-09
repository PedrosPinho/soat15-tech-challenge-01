/**
 * Cria a tabela `ordens_servico` (raiz do agregado) e `contadores_numero_os`,
 * substituto da coleção auxiliar `OSCounterModel` do Mongo.
 *
 * `contadores_numero_os` mantém o contador **por dia** (`data_chave`, formato
 * `YYYYMMDD`), não uma `SEQUENCE` nativa global — o VO `NumeroOS` (numero-os.vo.ts)
 * exige o formato `OS-YYYYMMDD-####` com sequência reiniciada a cada dia, que uma
 * `SEQUENCE` monotônica não reproduz. A atomicidade equivalente ao
 * `findByIdAndUpdate`+`$inc`+`upsert` do Mongo vem de
 * `INSERT ... ON CONFLICT (data_chave) DO UPDATE ... RETURNING sequencia`
 * (ver `PostgresOrdemServicoRepository.nextSequence`).
 *
 * Desvios documentados em relação a docs/architecture/data-model.md: `data_inicio`,
 * `data_conclusao`, `motivo_cancelamento` e `tem_pagamento` foram adicionados —
 * exigidos por `OrdemServico.create()`/`iniciar()`/`concluir()`/`cancelar()`/
 * `registrarPagamento()`, e o ER do documento é uma visão simplificada. `cpf_cnpj`
 * e `placa` são snapshots históricos (independentes do cadastro atual de
 * Cliente/Veículo), mesma semântica do documento Mongo.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('status_os', [
    'RECEBIDA',
    'EM_DIAGNOSTICO',
    'AGUARDANDO_APROVACAO',
    'EM_EXECUCAO',
    'FINALIZADA',
    'ENTREGUE',
    'CANCELADA',
  ]);

  pgm.createTable('ordens_servico', {
    id: { type: 'uuid', primaryKey: true },
    numero_os: { type: 'varchar(20)', notNull: true },
    cliente_id: { type: 'uuid', notNull: true, references: 'clientes', onDelete: 'RESTRICT' },
    veiculo_id: { type: 'uuid', notNull: true, references: 'veiculos', onDelete: 'RESTRICT' },
    cpf_cnpj: { type: 'varchar(14)' },
    placa: { type: 'varchar(7)' },
    quilometragem_entrada: { type: 'integer', notNull: true },
    status: { type: 'status_os', notNull: true, default: 'RECEBIDA' },
    data_abertura: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    data_inicio: { type: 'timestamptz' },
    data_conclusao: { type: 'timestamptz' },
    observacoes: { type: 'text' },
    motivo_cancelamento: { type: 'text' },
    tem_pagamento: { type: 'boolean', notNull: true, default: false },
    atualizado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('ordens_servico', 'ordens_servico_numero_os_unique', { unique: 'numero_os' });
  pgm.createIndex('ordens_servico', 'cliente_id');
  pgm.createIndex('ordens_servico', 'veiculo_id');
  pgm.createIndex('ordens_servico', 'status');

  pgm.createTable('contadores_numero_os', {
    data_chave: { type: 'varchar(8)', primaryKey: true },
    sequencia: { type: 'integer', notNull: true, default: 0 },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('contadores_numero_os');
  pgm.dropTable('ordens_servico');
  pgm.dropType('status_os');
};
