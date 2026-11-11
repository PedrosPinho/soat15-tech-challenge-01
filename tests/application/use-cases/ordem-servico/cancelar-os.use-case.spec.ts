import { CancelarOSUseCase } from '@application/use-cases/ordem-servico/cancelar-os.use-case';
import { SagaOrchestrator } from '@application/saga/saga-orchestrator';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';

const makeOS = () =>
  OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
  });

const makeSaga = (cancelar: jest.Mock) => ({ cancelar }) as unknown as SagaOrchestrator;

describe('CancelarOSUseCase', () => {
  it('delega ao orquestrador (dispara a compensação) e devolve a OS atual', async () => {
    const cancelar = jest.fn().mockResolvedValue(makeOS());
    const result = await new CancelarOSUseCase(makeSaga(cancelar)).execute({
      id: 'os-uuid-1',
      motivo: 'Cliente desistiu do serviço',
    });
    expect(cancelar).toHaveBeenCalledWith('os-uuid-1', 'Cliente desistiu do serviço');
    expect(result).toMatchObject({ id: 'os-uuid-1', status: 'RECEBIDA' });
  });

  it('propaga NotFound', async () => {
    const cancelar = jest.fn().mockRejectedValue(new NotFoundError('x'));
    await expect(
      new CancelarOSUseCase(makeSaga(cancelar)).execute({ id: 'nope', motivo: 'm' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('propaga erro de regra de negócio', async () => {
    const cancelar = jest.fn().mockRejectedValue(new ValidationError('OS finalizada'));
    await expect(
      new CancelarOSUseCase(makeSaga(cancelar)).execute({ id: 'os', motivo: 'm' }),
    ).rejects.toThrow(ValidationError);
  });
});
