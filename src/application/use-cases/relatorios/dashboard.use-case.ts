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
    const [todas, recebidas, emExecucao, finalizadas, canceladas, receitaTotal, itensEstoque] =
      await Promise.all([
        this.osRepo.list(1, 1, {}),
        this.osRepo.list(1, 1, { status: 'RECEBIDA' }),
        this.osRepo.list(1, 1, { status: 'EM_EXECUCAO' }),
        this.osRepo.list(1, 1, { status: 'FINALIZADA' }),
        this.osRepo.list(1, 1, { status: 'CANCELADA' }),
        this.pagamentoRepo.sumConfirmados(),
        this.estoqueRepo.list(),
      ]);

    const itensAbaixoDoMinimo = itensEstoque.filter((i) => i.isAbaixoDoMinimo).length;

    return {
      ordensServico: {
        total: todas.total,
        recebidas: recebidas.total,
        emExecucao: emExecucao.total,
        finalizadas: finalizadas.total,
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
