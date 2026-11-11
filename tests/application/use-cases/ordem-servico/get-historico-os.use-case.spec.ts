import { GetHistoricoOSUseCase } from '@application/use-cases/ordem-servico/get-historico-os.use-case';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { NotFoundError } from '@shared/errors/domain.error';

const os = (status: 'AGUARDANDO_PAGAMENTO' | 'RECEBIDA') =>
  OrdemServico.create({
    id: 'os1', numeroOS: 'OS-1', clienteId: 'c', veiculoId: 'v', quilometragemEntrada: 1, status,
  });

const em = new Date('2026-11-11T12:00:00Z');
const make = (ordem: OrdemServico | null, saga: unknown) =>
  new GetHistoricoOSUseCase(
    { findById: jest.fn().mockResolvedValue(ordem) } as never,
    {
      findByOrdemServicoId: jest.fn().mockResolvedValue(saga),
      listLog: jest.fn().mockResolvedValue([
        { sagaId: 's', passo: 'DIAGNOSTICO', acao: 'SolicitarDiagnostico', resultado: 'OK', ocorridoEm: em },
      ]),
    } as never,
    {
      listByOrdemServico: jest.fn().mockResolvedValue([
        { ordemServicoId: 'os1', statusNovo: 'RECEBIDA', ocorridoEm: em },
        { ordemServicoId: 'os1', statusAnterior: 'RECEBIDA', statusNovo: 'EM_DIAGNOSTICO', motivo: 'm', ocorridoEm: em },
      ]),
    } as never,
  );

const saga = {
  id: 's', status: 'EM_ANDAMENTO', passoAtual: 'PAGAMENTO', expiraEm: em,
  dados: { initPoint: 'http://mp/checkout' },
};

describe('GetHistoricoOSUseCase', () => {
  it('junta histórico de status e passos da saga', async () => {
    const r = await make(os('RECEBIDA'), saga).execute('os1');
    expect(r.status.map((s) => s.para)).toEqual(['RECEBIDA', 'EM_DIAGNOSTICO']);
    expect(r.status[1]).toMatchObject({ de: 'RECEBIDA', motivo: 'm', em: em.toISOString() });
    expect(r.saga).toMatchObject({ id: 's', status: 'EM_ANDAMENTO', passoAtual: 'PAGAMENTO' });
    expect(r.saga?.passos).toEqual([
      { passo: 'DIAGNOSTICO', acao: 'SolicitarDiagnostico', resultado: 'OK', detalhe: undefined, em: em.toISOString() },
    ]);
  });

  it('expõe o link de pagamento só enquanto a OS aguarda pagamento', async () => {
    expect((await make(os('AGUARDANDO_PAGAMENTO'), saga).execute('os1')).saga?.linkPagamento).toBe('http://mp/checkout');
    expect((await make(os('RECEBIDA'), saga).execute('os1')).saga?.linkPagamento).toBeUndefined();
  });

  it('OS sem saga (legada): saga ausente', async () => {
    expect((await make(os('RECEBIDA'), null).execute('os1')).saga).toBeUndefined();
  });

  it('OS inexistente: NotFound', async () => {
    await expect(make(null, null).execute('x')).rejects.toThrow(NotFoundError);
  });
});
