import { IPagamentoRepository } from '@domain/repositories/pagamento.repository';
import {
  ListPagamentosDto,
  ListPagamentosResponseDto,
} from '@application/dtos/pagamento/pagamento.dto';
import { PagamentoMapper } from '@application/mappers/pagamento.mapper';

export class ListPagamentosUseCase {
  constructor(private readonly pagamentoRepo: IPagamentoRepository) {}

  async execute(dto: ListPagamentosDto): Promise<ListPagamentosResponseDto> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const { pagamentos, total } = await this.pagamentoRepo.list(page, limit, {
      ordemServicoId: dto.ordemServicoId,
      status: dto.status,
    });
    return { pagamentos: pagamentos.map(PagamentoMapper.toDto), total, page, limit };
  }
}
