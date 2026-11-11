import { Servico } from '@domain/entities/servico.entity';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';

function makeOS(overrides: Partial<Parameters<typeof OrdemServico.create>[0]> = {}): OrdemServico {
  return OrdemServico.create({
    numeroOS: 'OS-20240315-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 45000,
    ...overrides,
  });
}

describe('OrdemServico entity', () => {
  describe('create', () => {
    it('creates with status RECEBIDA by default', () => {
      const os = makeOS();
      expect(os.status).toBe('RECEBIDA');
    });

    it('sets dataAbertura automatically', () => {
      const before = new Date();
      const os = makeOS();
      expect(os.dataAbertura.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('has no dataInicio or dataConclusao on creation', () => {
      const os = makeOS();
      expect(os.dataInicio).toBeUndefined();
      expect(os.dataConclusao).toBeUndefined();
    });

    it('stores all required fields', () => {
      const os = makeOS();
      expect(os.numeroOS).toBe('OS-20240315-0001');
      expect(os.clienteId).toBe('cliente-1');
      expect(os.veiculoId).toBe('veiculo-1');
      expect(os.quilometragemEntrada).toBe(45000);
      expect(os.id).toBeDefined();
    });

    it('accepts optional observacoes', () => {
      const os = makeOS({ observacoes: 'Veículo com barulho no motor' });
      expect(os.observacoes).toBe('Veículo com barulho no motor');
    });

    it('throws for negative quilometragemEntrada', () => {
      expect(() => makeOS({ quilometragemEntrada: -1 })).toThrow('Quilometragem de entrada não pode ser negativa');
    });

    it('throws for empty clienteId', () => {
      expect(() => makeOS({ clienteId: '' })).toThrow('clienteId é obrigatório');
    });

    it('throws for empty veiculoId', () => {
      expect(() => makeOS({ veiculoId: '' })).toThrow('veiculoId é obrigatório');
    });

    it('throws for empty numeroOS', () => {
      expect(() => makeOS({ numeroOS: '' })).toThrow('numeroOS é obrigatório');
    });

    it('temPagamento is false by default', () => {
      const os = makeOS();
      expect(os.temPagamento).toBe(false);
    });
  });

  // Atalhos para chegar a cada estado pelo fluxo da Saga.
  const emDiagnostico = () => makeOS().iniciarDiagnostico();
  const aguardandoAprovacao = () => emDiagnostico().aguardarAprovacao();
  const aguardandoPagamento = () => aguardandoAprovacao().aguardarPagamento();
  const emExecucao = () => aguardandoPagamento().confirmarPagamento();
  const finalizada = () => emExecucao().concluir();

  describe('iniciarDiagnostico', () => {
    it('transitions from RECEBIDA to EM_DIAGNOSTICO and sets dataInicio', () => {
      const before = new Date();
      const started = makeOS().iniciarDiagnostico();
      expect(started.status).toBe('EM_DIAGNOSTICO');
      expect(started.dataInicio!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('returns a new instance (immutability)', () => {
      const os = makeOS();
      expect(os.iniciarDiagnostico()).not.toBe(os);
      expect(os.status).toBe('RECEBIDA');
    });

    it('throws when not RECEBIDA', () => {
      expect(() => emDiagnostico().iniciarDiagnostico()).toThrow(
        'OS deve estar RECEBIDA para iniciar o diagnóstico',
      );
    });
  });

  describe('registrarDiagnostico', () => {
    const servico = Servico.create({
      descricao: 'Troca de óleo',
      tempoEstimadoMinutos: 30,
      valorMaoDeObra: 100,
      pecasUtilizadas: [{ pecaId: 'p1', quantidade: 2, precoUnitario: 50 }],
    });

    it('substitui os serviços pelo resultado do diagnóstico', () => {
      const os = emDiagnostico().registrarDiagnostico([servico]);
      expect(os.servicos).toHaveLength(1);
      expect(os.valorTotal).toBe(200);
    });

    it('throws when not EM_DIAGNOSTICO', () => {
      expect(() => makeOS().registrarDiagnostico([servico])).toThrow(
        'OS deve estar EM_DIAGNOSTICO para registrar o diagnóstico',
      );
    });
  });

  describe('aguardarAprovacao', () => {
    it('transitions from EM_DIAGNOSTICO to AGUARDANDO_APROVACAO', () => {
      expect(aguardandoAprovacao().status).toBe('AGUARDANDO_APROVACAO');
    });

    it('returns a new instance (immutability)', () => {
      const diagnostico = emDiagnostico();
      expect(diagnostico.aguardarAprovacao()).not.toBe(diagnostico);
      expect(diagnostico.status).toBe('EM_DIAGNOSTICO');
    });

    it('throws when not EM_DIAGNOSTICO', () => {
      expect(() => makeOS().aguardarAprovacao()).toThrow(
        'OS deve estar EM_DIAGNOSTICO para aguardar aprovação',
      );
    });
  });

  describe('aguardarPagamento', () => {
    it('transitions from AGUARDANDO_APROVACAO to AGUARDANDO_PAGAMENTO', () => {
      expect(aguardandoPagamento().status).toBe('AGUARDANDO_PAGAMENTO');
    });

    it('throws when not AGUARDANDO_APROVACAO', () => {
      expect(() => emDiagnostico().aguardarPagamento()).toThrow(
        'OS deve estar AGUARDANDO_APROVACAO para aguardar pagamento',
      );
    });
  });

  describe('confirmarPagamento', () => {
    it('transitions from AGUARDANDO_PAGAMENTO to EM_EXECUCAO and marks temPagamento', () => {
      const os = aguardandoPagamento().confirmarPagamento();
      expect(os.status).toBe('EM_EXECUCAO');
      expect(os.temPagamento).toBe(true);
    });

    it('returns a new instance (immutability)', () => {
      const aguardando = aguardandoPagamento();
      expect(aguardando.confirmarPagamento()).not.toBe(aguardando);
      expect(aguardando.temPagamento).toBe(false);
    });

    it('throws when not AGUARDANDO_PAGAMENTO', () => {
      expect(() => aguardandoAprovacao().confirmarPagamento()).toThrow(
        'OS deve estar AGUARDANDO_PAGAMENTO para confirmar o pagamento',
      );
    });
  });

  describe('estornarPagamento', () => {
    it('zera temPagamento (compensação), mantendo o status', () => {
      const os = emExecucao().estornarPagamento();
      expect(os.temPagamento).toBe(false);
      expect(os.status).toBe('EM_EXECUCAO');
    });

    it('throws when there is no payment', () => {
      expect(() => aguardandoPagamento().estornarPagamento()).toThrow(
        'OS não possui pagamento a estornar',
      );
    });
  });

  describe('concluir', () => {
    it('transitions from EM_EXECUCAO to FINALIZADA and sets dataConclusao', () => {
      const before = new Date();
      const os = emExecucao().concluir();
      expect(os.status).toBe('FINALIZADA');
      expect(os.dataConclusao!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('returns a new instance (immutability)', () => {
      const exec = emExecucao();
      expect(exec.concluir()).not.toBe(exec);
      expect(exec.status).toBe('EM_EXECUCAO');
    });

    it('throws when not EM_EXECUCAO', () => {
      expect(() => makeOS().concluir()).toThrow('OS deve estar EM_EXECUCAO para ser finalizada');
    });
  });

  describe('entregar', () => {
    it('transitions from FINALIZADA to ENTREGUE', () => {
      expect(finalizada().entregar().status).toBe('ENTREGUE');
    });

    it('returns a new instance (immutability)', () => {
      const fin = finalizada();
      expect(fin.entregar()).not.toBe(fin);
      expect(fin.status).toBe('FINALIZADA');
    });

    it('throws when not FINALIZADA', () => {
      expect(() => emExecucao().entregar()).toThrow('OS deve estar FINALIZADA para ser entregue');
    });
  });

  describe('cancelar', () => {
    it.each([
      ['RECEBIDA', () => makeOS()],
      ['EM_DIAGNOSTICO', emDiagnostico],
      ['AGUARDANDO_APROVACAO', aguardandoAprovacao],
      ['AGUARDANDO_PAGAMENTO', aguardandoPagamento],
    ])('transitions from %s to CANCELADA', (_status, build) => {
      expect(build().cancelar('Cliente desistiu').status).toBe('CANCELADA');
    });

    it('stores the motivo', () => {
      expect(makeOS().cancelar('Cliente desistiu').motivoCancelamento).toBe('Cliente desistiu');
    });

    it('throws when already FINALIZADA', () => {
      expect(() => finalizada().cancelar('Tentativa')).toThrow(
        'OS finalizada ou entregue não pode ser cancelada',
      );
    });

    it('throws when already ENTREGUE', () => {
      expect(() => finalizada().entregar().cancelar('Tentativa')).toThrow(
        'OS finalizada ou entregue não pode ser cancelada',
      );
    });

    it('throws when already CANCELADA', () => {
      expect(() => makeOS().cancelar('Primeiro').cancelar('Segundo')).toThrow('OS já está cancelada');
    });

    it('throws while the payment has not been refunded', () => {
      expect(() => emExecucao().cancelar('Tentativa')).toThrow(
        'OS com pagamento não pode ser cancelada',
      );
    });

    it('can be cancelled after the payment is refunded (compensação)', () => {
      expect(emExecucao().estornarPagamento().cancelar('Reparo falhou').status).toBe('CANCELADA');
    });

    it('requires a non-empty motivo', () => {
      expect(() => makeOS().cancelar('')).toThrow('Motivo de cancelamento é obrigatório');
    });
  });

  describe('adicionarServico', () => {
    const servico = Servico.create({
      descricao: 'Alinhamento',
      tempoEstimadoMinutos: 20,
      valorMaoDeObra: 80,
    });

    it('adiciona serviço enquanto a OS está aberta', () => {
      expect(emDiagnostico().adicionarServico(servico).servicos).toHaveLength(1);
    });

    it.each([
      ['FINALIZADA', finalizada],
      ['CANCELADA', () => makeOS().cancelar('x')],
    ])('rejeita em OS %s', (_s, build) => {
      expect(() => build().adicionarServico(servico)).toThrow(
        'Não é possível adicionar serviços a uma OS finalizada, entregue ou cancelada',
      );
    });
  });

  describe('transições inválidas a partir de cada estado', () => {
    const metodos = {
      iniciarDiagnostico: (os: OrdemServico) => os.iniciarDiagnostico(),
      aguardarAprovacao: (os: OrdemServico) => os.aguardarAprovacao(),
      aguardarPagamento: (os: OrdemServico) => os.aguardarPagamento(),
      confirmarPagamento: (os: OrdemServico) => os.confirmarPagamento(),
      concluir: (os: OrdemServico) => os.concluir(),
      entregar: (os: OrdemServico) => os.entregar(),
    } as const;

    // estado -> único método de avanço permitido
    const permitido: Record<string, keyof typeof metodos> = {
      RECEBIDA: 'iniciarDiagnostico',
      EM_DIAGNOSTICO: 'aguardarAprovacao',
      AGUARDANDO_APROVACAO: 'aguardarPagamento',
      AGUARDANDO_PAGAMENTO: 'confirmarPagamento',
      EM_EXECUCAO: 'concluir',
      FINALIZADA: 'entregar',
    };
    const estados: [string, () => OrdemServico][] = [
      ['RECEBIDA', () => makeOS()],
      ['EM_DIAGNOSTICO', emDiagnostico],
      ['AGUARDANDO_APROVACAO', aguardandoAprovacao],
      ['AGUARDANDO_PAGAMENTO', aguardandoPagamento],
      ['EM_EXECUCAO', emExecucao],
      ['FINALIZADA', finalizada],
    ];

    for (const [estado, build] of estados) {
      for (const [nome, fn] of Object.entries(metodos)) {
        if (permitido[estado] === nome) {
          it(`${estado} -> ${nome} é permitido`, () => {
            expect(() => fn(build())).not.toThrow();
          });
        } else {
          it(`${estado} -> ${nome} é rejeitado`, () => {
            expect(() => fn(build())).toThrow();
          });
        }
      }
    }
  });
});
