import { PassoSaga, SagaPassoLog, SagaStatus } from '@domain/entities/saga.entity';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { ISagaRepository } from '@domain/repositories/saga.repository';
import { IStatusHistoricoRepository } from '@domain/repositories/status-historico.repository';
import { NotFoundError } from '@shared/errors/domain.error';

export interface HistoricoOSResponseDto {
  ordemServicoId: string;
  numeroOS: string;
  statusAtual: string;
  status: {
    de?: string;
    para: string;
    motivo?: string;
    em: string;
  }[];
  saga?: {
    id: string;
    status: SagaStatus;
    passoAtual: PassoSaga;
    /** Link de pagamento (Checkout Pro) enquanto a OS aguarda pagamento. */
    linkPagamento?: string;
    expiraEm?: string;
    passos: {
      passo: string;
      acao: string;
      resultado: SagaPassoLog['resultado'];
      detalhe?: string;
      em: string;
    }[];
  };
}

/** `GET /api/ordens-servico/:id/historico` — status + passos da Saga. */
export class GetHistoricoOSUseCase {
  constructor(
    private readonly osRepo: IOrdemServicoRepository,
    private readonly sagaRepo: ISagaRepository,
    private readonly historicoRepo: IStatusHistoricoRepository,
  ) {}

  async execute(id: string): Promise<HistoricoOSResponseDto> {
    const os = await this.osRepo.findById(id);
    if (!os) throw new NotFoundError(`Ordem de serviço ${id} não encontrada`);

    const [historico, saga] = await Promise.all([
      this.historicoRepo.listByOrdemServico(id),
      this.sagaRepo.findByOrdemServicoId(id),
    ]);
    const passos = saga ? await this.sagaRepo.listLog(saga.id) : [];

    return {
      ordemServicoId: os.id,
      numeroOS: os.numeroOS,
      statusAtual: os.status,
      status: historico.map((h) => ({
        de: h.statusAnterior,
        para: h.statusNovo,
        motivo: h.motivo,
        em: h.ocorridoEm.toISOString(),
      })),
      saga: saga
        ? {
            id: saga.id,
            status: saga.status,
            passoAtual: saga.passoAtual,
            linkPagamento: os.status === 'AGUARDANDO_PAGAMENTO' ? saga.dados.initPoint : undefined,
            expiraEm: saga.expiraEm?.toISOString(),
            passos: passos.map((p) => ({
              passo: p.passo,
              acao: p.acao,
              resultado: p.resultado,
              detalhe: p.detalhe,
              em: p.ocorridoEm.toISOString(),
            })),
          }
        : undefined,
    };
  }
}
