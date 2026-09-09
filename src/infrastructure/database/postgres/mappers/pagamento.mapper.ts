import { Pagamento, FormaPagamento, StatusPagamento } from '@domain/entities/pagamento.entity';

export interface PagamentoRow {
  id: string;
  ordem_servico_id: string;
  valor: string;
  forma_pagamento: FormaPagamento;
  status: StatusPagamento;
  data_pagamento: Date | null;
  observacoes: string | null;
  criado_em: Date;
}

export const toDomainPagamento = (row: PagamentoRow): Pagamento =>
  Pagamento.create({
    id: row.id,
    ordemServicoId: row.ordem_servico_id,
    valor: Number(row.valor),
    formaPagamento: row.forma_pagamento,
    status: row.status,
    dataPagamento: row.data_pagamento ?? undefined,
    observacoes: row.observacoes ?? undefined,
    criadoEm: row.criado_em,
  });
