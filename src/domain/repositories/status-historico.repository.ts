import { StatusOS } from '@domain/entities/ordem-servico.entity';

export interface StatusHistoricoEntry {
  ordemServicoId: string;
  statusAnterior?: StatusOS;
  statusNovo: StatusOS;
  motivo?: string;
  ocorridoEm: Date;
}

export interface IStatusHistoricoRepository {
  add(entry: StatusHistoricoEntry): Promise<void>;
  listByOrdemServico(ordemServicoId: string): Promise<StatusHistoricoEntry[]>;
}
