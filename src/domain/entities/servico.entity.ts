import { v4 as uuidv4 } from 'uuid';
import { ValidationError, ConflictError, NotFoundError } from '@shared/errors/domain.error';

export type StatusServico = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export interface PecaServico {
  pecaId: string;
  quantidade: number;
  precoUnitario: number;
}

export interface ServicoProps {
  id?: string;
  descricao: string;
  status?: StatusServico;
  tempoEstimadoMinutos: number;
  tempoRealMinutos?: number;
  valorMaoDeObra: number;
  pecasUtilizadas?: PecaServico[];
  observacoes?: string;
}

export class Servico {
  private constructor(
    public readonly id: string,
    public readonly descricao: string,
    public readonly status: StatusServico,
    public readonly tempoEstimadoMinutos: number,
    public readonly tempoRealMinutos: number | undefined,
    public readonly valorMaoDeObra: number,
    public readonly pecasUtilizadas: readonly PecaServico[],
    public readonly observacoes: string | undefined,
  ) {}

  static create(props: ServicoProps): Servico {
    Servico.validate(props);
    return new Servico(
      props.id ?? uuidv4(),
      props.descricao.trim(),
      props.status ?? 'PENDENTE',
      props.tempoEstimadoMinutos,
      props.tempoRealMinutos,
      props.valorMaoDeObra,
      props.pecasUtilizadas ?? [],
      props.observacoes,
    );
  }

  get valorTotalPecas(): number {
    return this.pecasUtilizadas.reduce((acc, p) => acc + p.quantidade * p.precoUnitario, 0);
  }

  get valorTotal(): number {
    return this.valorMaoDeObra + this.valorTotalPecas;
  }

  iniciar(): Servico {
    if (this.status !== 'PENDENTE') {
      throw new ValidationError('Serviço deve estar PENDENTE para ser iniciado');
    }
    return this.copy({ status: 'EM_ANDAMENTO' });
  }

  concluir(tempoReal: number): Servico {
    if (this.status !== 'EM_ANDAMENTO') {
      throw new ValidationError('Serviço deve estar EM_ANDAMENTO para ser concluído');
    }
    if (tempoReal <= 0) {
      throw new ValidationError('Tempo real deve ser maior que zero');
    }
    return this.copy({ status: 'CONCLUIDO', tempoRealMinutos: tempoReal });
  }

  cancelar(): Servico {
    if (this.status === 'CONCLUIDO') throw new ValidationError('Serviço concluído não pode ser cancelado');
    if (this.status === 'CANCELADO') throw new ValidationError('Serviço já está cancelado');
    return this.copy({ status: 'CANCELADO' });
  }

  adicionarPeca(pecaId: string, quantidade: number, precoUnitario: number): Servico {
    if (this.status === 'CONCLUIDO' || this.status === 'CANCELADO') {
      throw new ValidationError('Não é possível adicionar peças a um serviço concluído ou cancelado');
    }
    if (!pecaId.trim()) throw new ValidationError('pecaId é obrigatório');
    if (quantidade <= 0) throw new ValidationError('Quantidade deve ser maior que zero');
    if (precoUnitario < 0) throw new ValidationError('Preço unitário não pode ser negativo');
    if (this.pecasUtilizadas.some((p) => p.pecaId === pecaId)) {
      throw new ConflictError('Peça já adicionada ao serviço');
    }
    return this.copy({ pecasUtilizadas: [...this.pecasUtilizadas, { pecaId, quantidade, precoUnitario }] });
  }

  removerPeca(pecaId: string): Servico {
    if (this.status === 'CONCLUIDO' || this.status === 'CANCELADO') {
      throw new ValidationError('Não é possível remover peças de um serviço concluído ou cancelado');
    }
    if (!this.pecasUtilizadas.some((p) => p.pecaId === pecaId)) {
      throw new NotFoundError('Peça não encontrada no serviço');
    }
    return this.copy({ pecasUtilizadas: this.pecasUtilizadas.filter((p) => p.pecaId !== pecaId) });
  }

  private copy(overrides: Partial<{
    status: StatusServico;
    tempoRealMinutos: number;
    pecasUtilizadas: PecaServico[];
  }>): Servico {
    return new Servico(
      this.id,
      this.descricao,
      overrides.status ?? this.status,
      this.tempoEstimadoMinutos,
      overrides.tempoRealMinutos ?? this.tempoRealMinutos,
      this.valorMaoDeObra,
      overrides.pecasUtilizadas ?? this.pecasUtilizadas,
      this.observacoes,
    );
  }

  private static validate(props: ServicoProps): void {
    if (!props.descricao.trim()) throw new ValidationError('Descrição é obrigatória');
    if (props.descricao.trim().length < 3) throw new ValidationError('Descrição deve ter pelo menos 3 caracteres');
    if (props.tempoEstimadoMinutos <= 0) throw new ValidationError('Tempo estimado deve ser maior que zero');
    if (props.valorMaoDeObra < 0) throw new ValidationError('Valor de mão de obra não pode ser negativo');
  }
}
