import { Servico } from '@domain/entities/servico.entity';

function makeServico(overrides: Partial<{
  descricao: string;
  tempoEstimadoMinutos: number;
  valorMaoDeObra: number;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
}> = {}): Servico {
  return Servico.create({
    descricao: overrides.descricao ?? 'Troca de óleo e filtro',
    tempoEstimadoMinutos: overrides.tempoEstimadoMinutos ?? 60,
    valorMaoDeObra: overrides.valorMaoDeObra ?? 150,
    status: overrides.status,
  });
}

describe('Servico entity', () => {
  describe('create', () => {
    it('creates with defaults', () => {
      const s = makeServico();
      expect(s.id).toBeDefined();
      expect(s.descricao).toBe('Troca de óleo e filtro');
      expect(s.status).toBe('PENDENTE');
      expect(s.tempoEstimadoMinutos).toBe(60);
      expect(s.tempoRealMinutos).toBeUndefined();
      expect(s.valorMaoDeObra).toBe(150);
      expect(s.pecasUtilizadas).toHaveLength(0);
      expect(s.observacoes).toBeUndefined();
    });

    it('preserves provided id', () => {
      const s = Servico.create({ id: 'srv-123', descricao: 'Revisão geral', tempoEstimadoMinutos: 120, valorMaoDeObra: 300 });
      expect(s.id).toBe('srv-123');
    });

    it('accepts optional observacoes', () => {
      const s = Servico.create({ descricao: 'Alinhamento', tempoEstimadoMinutos: 30, valorMaoDeObra: 80, observacoes: 'Checar balanceamento' });
      expect(s.observacoes).toBe('Checar balanceamento');
    });

    it('throws for empty descricao', () => {
      expect(() => makeServico({ descricao: '' })).toThrow('Descrição é obrigatória');
    });

    it('throws for descricao with only whitespace', () => {
      expect(() => makeServico({ descricao: '   ' })).toThrow('Descrição é obrigatória');
    });

    it('throws for descricao shorter than 3 chars', () => {
      expect(() => makeServico({ descricao: 'AB' })).toThrow('Descrição deve ter pelo menos 3 caracteres');
    });

    it('throws for zero tempoEstimadoMinutos', () => {
      expect(() => makeServico({ tempoEstimadoMinutos: 0 })).toThrow('Tempo estimado deve ser maior que zero');
    });

    it('throws for negative tempoEstimadoMinutos', () => {
      expect(() => makeServico({ tempoEstimadoMinutos: -10 })).toThrow('Tempo estimado deve ser maior que zero');
    });

    it('throws for negative valorMaoDeObra', () => {
      expect(() => makeServico({ valorMaoDeObra: -1 })).toThrow('Valor de mão de obra não pode ser negativo');
    });

    it('allows zero valorMaoDeObra (only parts charged)', () => {
      const s = makeServico({ valorMaoDeObra: 0 });
      expect(s.valorMaoDeObra).toBe(0);
    });
  });

  describe('valorTotalPecas', () => {
    it('returns 0 when no pecas', () => {
      expect(makeServico().valorTotalPecas).toBe(0);
    });

    it('returns sum of quantidade * precoUnitario', () => {
      const s = makeServico()
        .adicionarPeca('peca-1', 2, 50)
        .adicionarPeca('peca-2', 3, 20);
      expect(s.valorTotalPecas).toBe(160);
    });
  });

  describe('valorTotal', () => {
    it('is valorMaoDeObra when no pecas', () => {
      expect(makeServico({ valorMaoDeObra: 200 }).valorTotal).toBe(200);
    });

    it('is maoDeObra + totalPecas', () => {
      const s = makeServico({ valorMaoDeObra: 100 }).adicionarPeca('peca-1', 2, 75);
      expect(s.valorTotal).toBe(250);
    });
  });

  describe('iniciar', () => {
    it('transitions from PENDENTE to EM_ANDAMENTO', () => {
      const updated = makeServico().iniciar();
      expect(updated.status).toBe('EM_ANDAMENTO');
    });

    it('returns a new instance (immutability)', () => {
      const s = makeServico();
      const updated = s.iniciar();
      expect(updated).not.toBe(s);
      expect(s.status).toBe('PENDENTE');
    });

    it('throws when status is not PENDENTE', () => {
      const em = makeServico().iniciar();
      expect(() => em.iniciar()).toThrow('Serviço deve estar PENDENTE para ser iniciado');
    });
  });

  describe('concluir', () => {
    it('transitions from EM_ANDAMENTO to CONCLUIDO and stores tempoReal', () => {
      const updated = makeServico().iniciar().concluir(45);
      expect(updated.status).toBe('CONCLUIDO');
      expect(updated.tempoRealMinutos).toBe(45);
    });

    it('returns a new instance (immutability)', () => {
      const em = makeServico().iniciar();
      const concluido = em.concluir(45);
      expect(concluido).not.toBe(em);
      expect(em.status).toBe('EM_ANDAMENTO');
    });

    it('throws when status is not EM_ANDAMENTO', () => {
      expect(() => makeServico().concluir(30)).toThrow('Serviço deve estar EM_ANDAMENTO para ser concluído');
    });

    it('throws for zero tempoReal', () => {
      expect(() => makeServico().iniciar().concluir(0)).toThrow('Tempo real deve ser maior que zero');
    });

    it('throws for negative tempoReal', () => {
      expect(() => makeServico().iniciar().concluir(-5)).toThrow('Tempo real deve ser maior que zero');
    });
  });

  describe('cancelar', () => {
    it('transitions from PENDENTE to CANCELADO', () => {
      const updated = makeServico().cancelar();
      expect(updated.status).toBe('CANCELADO');
    });

    it('transitions from EM_ANDAMENTO to CANCELADO', () => {
      const updated = makeServico().iniciar().cancelar();
      expect(updated.status).toBe('CANCELADO');
    });

    it('returns a new instance (immutability)', () => {
      const s = makeServico();
      const updated = s.cancelar();
      expect(updated).not.toBe(s);
      expect(s.status).toBe('PENDENTE');
    });

    it('throws when already CONCLUIDO', () => {
      const concluido = makeServico().iniciar().concluir(30);
      expect(() => concluido.cancelar()).toThrow('Serviço concluído não pode ser cancelado');
    });

    it('throws when already CANCELADO', () => {
      const cancelado = makeServico().cancelar();
      expect(() => cancelado.cancelar()).toThrow('Serviço já está cancelado');
    });
  });

  describe('adicionarPeca', () => {
    it('adds a peca to pecasUtilizadas', () => {
      const s = makeServico().adicionarPeca('peca-1', 2, 50);
      expect(s.pecasUtilizadas).toHaveLength(1);
      expect(s.pecasUtilizadas[0]).toEqual({ pecaId: 'peca-1', quantidade: 2, precoUnitario: 50 });
    });

    it('returns a new instance (immutability)', () => {
      const s = makeServico();
      const updated = s.adicionarPeca('peca-1', 1, 30);
      expect(updated).not.toBe(s);
      expect(s.pecasUtilizadas).toHaveLength(0);
    });

    it('allows adding multiple distinct pecas', () => {
      const s = makeServico()
        .adicionarPeca('peca-1', 1, 10)
        .adicionarPeca('peca-2', 3, 20);
      expect(s.pecasUtilizadas).toHaveLength(2);
    });

    it('throws for duplicate pecaId', () => {
      const s = makeServico().adicionarPeca('peca-1', 1, 10);
      expect(() => s.adicionarPeca('peca-1', 2, 15)).toThrow('Peça já adicionada ao serviço');
    });

    it('throws for empty pecaId', () => {
      expect(() => makeServico().adicionarPeca('', 1, 10)).toThrow('pecaId é obrigatório');
    });

    it('throws for zero quantidade', () => {
      expect(() => makeServico().adicionarPeca('peca-1', 0, 10)).toThrow('Quantidade deve ser maior que zero');
    });

    it('throws for negative quantidade', () => {
      expect(() => makeServico().adicionarPeca('peca-1', -1, 10)).toThrow('Quantidade deve ser maior que zero');
    });

    it('throws for negative precoUnitario', () => {
      expect(() => makeServico().adicionarPeca('peca-1', 1, -5)).toThrow('Preço unitário não pode ser negativo');
    });

    it('allows zero precoUnitario (internal part with no cost)', () => {
      const s = makeServico().adicionarPeca('peca-1', 1, 0);
      expect(s.pecasUtilizadas[0]!.precoUnitario).toBe(0);
    });

    it('throws when Servico is CONCLUIDO', () => {
      const concluido = makeServico().iniciar().concluir(30);
      expect(() => concluido.adicionarPeca('peca-1', 1, 10)).toThrow('Não é possível adicionar peças a um serviço concluído ou cancelado');
    });

    it('throws when Servico is CANCELADO', () => {
      const cancelado = makeServico().cancelar();
      expect(() => cancelado.adicionarPeca('peca-1', 1, 10)).toThrow('Não é possível adicionar peças a um serviço concluído ou cancelado');
    });
  });

  describe('removerPeca', () => {
    it('removes peca by pecaId', () => {
      const s = makeServico()
        .adicionarPeca('peca-1', 2, 50)
        .adicionarPeca('peca-2', 1, 30)
        .removerPeca('peca-1');
      expect(s.pecasUtilizadas).toHaveLength(1);
      expect(s.pecasUtilizadas[0]!.pecaId).toBe('peca-2');
    });

    it('returns a new instance (immutability)', () => {
      const s = makeServico().adicionarPeca('peca-1', 1, 10);
      const updated = s.removerPeca('peca-1');
      expect(updated).not.toBe(s);
      expect(s.pecasUtilizadas).toHaveLength(1);
    });

    it('throws when pecaId not found', () => {
      expect(() => makeServico().removerPeca('peca-inexistente')).toThrow('Peça não encontrada no serviço');
    });

    it('throws when Servico is CONCLUIDO', () => {
      const concluido = makeServico().iniciar().concluir(30);
      expect(() => concluido.removerPeca('peca-1')).toThrow('Não é possível remover peças de um serviço concluído ou cancelado');
    });
  });
});
