import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';
import { ValidationError } from '@shared/errors/domain.error';

function makeServico(overrides: Partial<{
  id: string; descricao: string; preco: number; tempoEstimado: number; ativo: boolean;
}> = {}): CatalogoServico {
  return CatalogoServico.create({
    id: 'cs-uuid-1',
    descricao: 'Troca de óleo',
    preco: 80.0,
    tempoEstimado: 30,
    ...overrides,
  });
}

describe('CatalogoServico.create()', () => {
  it('cria instância com valores padrão', () => {
    const s = makeServico();
    expect(s.id).toBeDefined();
    expect(s.descricao).toBe('Troca de óleo');
    expect(s.preco).toBe(80.0);
    expect(s.tempoEstimado).toBe(30);
    expect(s.ativo).toBe(true);
  });

  it('gera id automaticamente quando não fornecido', () => {
    const s = CatalogoServico.create({ descricao: 'Alinhamento', preco: 60, tempoEstimado: 45 });
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('aceita ativo=false explícito', () => {
    const s = makeServico({ ativo: false });
    expect(s.ativo).toBe(false);
  });

  it('lança ValidationError quando descricao vazia', () => {
    expect(() => makeServico({ descricao: '' })).toThrow(ValidationError);
    expect(() => makeServico({ descricao: '   ' })).toThrow(ValidationError);
  });

  it('lança ValidationError quando preco é negativo', () => {
    expect(() => makeServico({ preco: -1 })).toThrow(ValidationError);
  });

  it('aceita preco zero', () => {
    const s = makeServico({ preco: 0 });
    expect(s.preco).toBe(0);
  });

  it('lança ValidationError quando tempoEstimado é negativo ou zero', () => {
    expect(() => makeServico({ tempoEstimado: 0 })).toThrow(ValidationError);
    expect(() => makeServico({ tempoEstimado: -5 })).toThrow(ValidationError);
  });
});

describe('CatalogoServico.editar()', () => {
  it('retorna nova instância com campos atualizados', () => {
    const original = makeServico();
    const editado = original.editar({ descricao: 'Troca de filtro', preco: 50, tempoEstimado: 20 });

    expect(editado).not.toBe(original);
    expect(editado.descricao).toBe('Troca de filtro');
    expect(editado.preco).toBe(50);
    expect(editado.tempoEstimado).toBe(20);
    expect(editado.id).toBe(original.id);
    expect(editado.ativo).toBe(original.ativo);
  });

  it('mantém campos não alterados quando não informados', () => {
    const original = makeServico();
    const editado = original.editar({ preco: 99 });

    expect(editado.descricao).toBe(original.descricao);
    expect(editado.tempoEstimado).toBe(original.tempoEstimado);
    expect(editado.preco).toBe(99);
  });

  it('lança ValidationError para descricao vazia', () => {
    const s = makeServico();
    expect(() => s.editar({ descricao: '' })).toThrow(ValidationError);
  });

  it('lança ValidationError para preco negativo', () => {
    const s = makeServico();
    expect(() => s.editar({ preco: -10 })).toThrow(ValidationError);
  });

  it('lança ValidationError para tempoEstimado zero', () => {
    const s = makeServico();
    expect(() => s.editar({ tempoEstimado: 0 })).toThrow(ValidationError);
  });
});

describe('CatalogoServico.deletar()', () => {
  it('retorna nova instância com ativo=false', () => {
    const s = makeServico();
    const deletado = s.deletar();

    expect(deletado).not.toBe(s);
    expect(deletado.ativo).toBe(false);
    expect(deletado.id).toBe(s.id);
    expect(deletado.descricao).toBe(s.descricao);
  });

  it('permite deletar serviço já inativo (idempotente)', () => {
    const s = makeServico({ ativo: false });
    const deletado = s.deletar();
    expect(deletado.ativo).toBe(false);
  });
});
