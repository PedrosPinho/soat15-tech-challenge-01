import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IPagamentoRepository } from '@domain/repositories/pagamento.repository';
import { IItemEstoqueRepository } from '@domain/repositories/item-estoque.repository';
import { DashboardResponseDto } from '@application/dtos/relatorios/dashboard.dto';

export class DashboardUseCase {
  constructor(
    private readonly osRepo: IOrdemServicoRepository,
    private readonly pagamentoRepo: IPagamentoRepository,
    private readonly estoqueRepo: IItemEstoqueRepository,
  ) {}

  async execute(): Promise<DashboardResponseDto> {
    const [todas, abertas, emAndamento, concluidas, canceladas, receitaTotal, itensEstoque] =
      await Promise.all([
        this.osRepo.list(1, 1, {}),
        this.osRepo.list(1, 1, { status: 'ABERTA' }),
        this.osRepo.list(1, 1, { status: 'EM_ANDAMENTO' }),
        this.osRepo.list(1, 1, { status: 'CONCLUIDA' }),
        this.osRepo.list(1, 1, { status: 'CANCELADA' }),
        this.pagamentoRepo.sumConfirmados(),
        this.estoqueRepo.list(),
      ]);

    const itensAbaixoDoMinimo = itensEstoque.filter((i) => i.isAbaixoDoMinimo).length;

    return {
      ordensServico: {
        total: todas.total,
        abertas: abertas.total,
        emAndamento: emAndamento.total,
        concluidas: concluidas.total,
        canceladas: canceladas.total,
      },
      financeiro: {
        receitaTotal,
      },
      estoque: {
        itensAbaixoDoMinimo,
      },
    };
  }
}
