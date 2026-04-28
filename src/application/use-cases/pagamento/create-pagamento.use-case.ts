import { Pagamento } from '@domain/entities/pagamento.entity';
import { IPagamentoRepository } from '@domain/repositories/pagamento.repository';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';
import { CreatePagamentoDto, PagamentoResponseDto } from '@application/dtos/pagamento/pagamento.dto';
import { PagamentoMapper } from '@application/mappers/pagamento.mapper';

export class CreatePagamentoUseCase {
  constructor(
    private readonly pagamentoRepo: IPagamentoRepository,
    private readonly osRepo: IOrdemServicoRepository,
  ) {}

  async execute(dto: CreatePagamentoDto): Promise<PagamentoResponseDto> {
    const os = await this.osRepo.findById(dto.ordemServicoId);
    if (!os) throw new NotFoundError(`Ordem de serviço ${dto.ordemServicoId} não encontrada`);

    if (os.status !== 'EM_ANDAMENTO' && os.status !== 'CONCLUIDA') {
      throw new ValidationError('Pagamento só pode ser registrado em OS em andamento ou concluída');
    }

    const pagamento = Pagamento.create(dto).confirmar();

    const osAtualizada = os.registrarPagamento();
    await this.osRepo.update(osAtualizada);
    await this.pagamentoRepo.save(pagamento);

    return PagamentoMapper.toDto(pagamento);
  }
}
