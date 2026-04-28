import { Pagamento } from '@domain/entities/pagamento.entity';
import { PagamentoResponseDto } from '@application/dtos/pagamento/pagamento.dto';

export class PagamentoMapper {
  static toDto(pagamento: Pagamento): PagamentoResponseDto {
    return {
      id: pagamento.id,
      ordemServicoId: pagamento.ordemServicoId,
      valor: pagamento.valor,
      formaPagamento: pagamento.formaPagamento,
      status: pagamento.status,
      dataPagamento: pagamento.dataPagamento?.toISOString(),
      observacoes: pagamento.observacoes,
      criadoEm: pagamento.criadoEm.toISOString(),
    };
  }
}
