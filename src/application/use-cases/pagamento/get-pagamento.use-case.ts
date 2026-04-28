import { IPagamentoRepository } from '@domain/repositories/pagamento.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { PagamentoResponseDto } from '@application/dtos/pagamento/pagamento.dto';
import { PagamentoMapper } from '@application/mappers/pagamento.mapper';

export class GetPagamentoUseCase {
  constructor(private readonly pagamentoRepo: IPagamentoRepository) {}

  async execute(id: string): Promise<PagamentoResponseDto> {
    const pagamento = await this.pagamentoRepo.findById(id);
    if (!pagamento) throw new NotFoundError(`Pagamento ${id} não encontrado`);
    return PagamentoMapper.toDto(pagamento);
  }
}
