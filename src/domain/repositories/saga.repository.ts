import { SagaInstancia, SagaPassoLog } from '@domain/entities/saga.entity';

export class SagaConcurrencyError extends Error {
  constructor(sagaId: string) {
    super(`Saga ${sagaId} foi modificada concorrentemente (lock otimista)`);
    this.name = 'SagaConcurrencyError';
  }
}

export interface ISagaRepository {
  create(saga: SagaInstancia): Promise<void>;
  findByOrdemServicoId(ordemServicoId: string): Promise<SagaInstancia | null>;
  /**
   * Persiste exigindo `versao` igual à armazenada e incrementa-a. Lança
   * `SagaConcurrencyError` se outra escrita venceu a corrida.
   */
  update(saga: SagaInstancia): Promise<SagaInstancia>;
  /** Sagas em andamento/compensando com `expira_em` vencido. */
  findExpired(now: Date, limit: number): Promise<SagaInstancia[]>;
  appendLog(entry: SagaPassoLog): Promise<void>;
  listLog(sagaId: string): Promise<SagaPassoLog[]>;
}
