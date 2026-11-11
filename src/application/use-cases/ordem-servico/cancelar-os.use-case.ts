import { SagaOrchestrator } from '@application/saga/saga-orchestrator';
import { OrdemServicoResponseDto } from '@application/dtos/ordem-servico/ordem-servico.dto';
import { OrdemServicoMapper } from '@application/mappers/ordem-servico.mapper';

export interface CancelarOSDto {
  id: string;
  motivo: string;
}

/**
 * O cancelamento deixou de ser uma troca de status: dispara a **compensação**
 * da Saga (estorno, cancelamento de orçamento/execução, liberação de estoque).
 * A resposta traz a OS no estado atual; `CANCELADA` chega quando as
 * compensações são confirmadas.
 */
export class CancelarOSUseCase {
  constructor(private readonly saga: SagaOrchestrator) {}

  async execute(dto: CancelarOSDto): Promise<OrdemServicoResponseDto> {
    const os = await this.saga.cancelar(dto.id, dto.motivo);
    return OrdemServicoMapper.toDto(os);
  }
}
