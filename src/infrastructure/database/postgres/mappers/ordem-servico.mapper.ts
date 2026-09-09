import { OrdemServico, StatusOS } from '@domain/entities/ordem-servico.entity';
import { Servico, StatusServico } from '@domain/entities/servico.entity';

/** Linha de `ordens_servico` (raiz do agregado). */
export interface OrdemServicoRow {
  id: string;
  numero_os: string;
  cliente_id: string;
  veiculo_id: string;
  cpf_cnpj: string | null;
  placa: string | null;
  quilometragem_entrada: number;
  status: StatusOS;
  data_abertura: Date;
  data_inicio: Date | null;
  data_conclusao: Date | null;
  observacoes: string | null;
  motivo_cancelamento: string | null;
  tem_pagamento: boolean;
}

/** Linha de `servicos_os` (nível 2, um por serviço da OS). */
export interface ServicoOSRow {
  id: string;
  ordem_servico_id: string;
  ordem: number;
  descricao: string;
  status: StatusServico;
  tempo_estimado_minutos: number;
  tempo_real_minutos: number | null;
  valor_mao_de_obra: string;
  observacoes: string | null;
}

/** Linha de `servico_pecas` (nível 3, uma por peça usada num serviço). */
export interface ServicoPecaRow {
  id: string;
  servico_os_id: string;
  peca_id: string;
  descricao: string | null;
  quantidade: number;
  preco_unitario: string;
}

/**
 * Reconstrói a árvore `OrdemServico` -> `Servico[]` -> `pecasUtilizadas[]` a
 * partir das 3 linhas planas carregadas em lote (batch) pelo repositório —
 * ver `PostgresOrdemServicoRepository` para como `servicoRows`/`pecaRows` são
 * carregados via `WHERE ... = ANY($1)` para evitar N+1.
 */
export const toDomainOrdemServico = (
  osRow: OrdemServicoRow,
  servicoRows: ServicoOSRow[],
  pecaRowsByServicoId: Map<string, ServicoPecaRow[]>,
): OrdemServico => {
  const servicos = [...servicoRows]
    .sort((a, b) => a.ordem - b.ordem)
    .map((s) =>
      Servico.create({
        id: s.id,
        descricao: s.descricao,
        status: s.status,
        tempoEstimadoMinutos: s.tempo_estimado_minutos,
        tempoRealMinutos: s.tempo_real_minutos ?? undefined,
        valorMaoDeObra: Number(s.valor_mao_de_obra),
        observacoes: s.observacoes ?? undefined,
        pecasUtilizadas: (pecaRowsByServicoId.get(s.id) ?? []).map((p) => ({
          pecaId: p.peca_id,
          descricao: p.descricao ?? undefined,
          quantidade: p.quantidade,
          precoUnitario: Number(p.preco_unitario),
        })),
      }),
    );

  return OrdemServico.create({
    id: osRow.id,
    numeroOS: osRow.numero_os,
    clienteId: osRow.cliente_id,
    veiculoId: osRow.veiculo_id,
    cpfCnpj: osRow.cpf_cnpj ?? undefined,
    placa: osRow.placa ?? undefined,
    quilometragemEntrada: osRow.quilometragem_entrada,
    status: osRow.status,
    dataAbertura: osRow.data_abertura,
    dataInicio: osRow.data_inicio ?? undefined,
    dataConclusao: osRow.data_conclusao ?? undefined,
    observacoes: osRow.observacoes ?? undefined,
    motivoCancelamento: osRow.motivo_cancelamento ?? undefined,
    temPagamento: osRow.tem_pagamento,
    servicos,
  });
};
