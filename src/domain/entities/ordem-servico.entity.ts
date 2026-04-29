import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors/domain.error';
import { Servico } from '@domain/entities/servico.entity';

export type StatusOS =
  | 'RECEBIDA'
  | 'EM_DIAGNOSTICO'
  | 'AGUARDANDO_APROVACAO'
  | 'EM_EXECUCAO'
  | 'FINALIZADA'
  | 'ENTREGUE'
  | 'CANCELADA';

export interface OrdemServicoProps {
  id?: string;
  numeroOS: string;
  clienteId: string;
  veiculoId: string;
  quilometragemEntrada: number;
  status?: StatusOS;
  dataAbertura?: Date;
  dataInicio?: Date;
  dataConclusao?: Date;
  observacoes?: string;
  motivoCancelamento?: string;
  temPagamento?: boolean;
  servicos?: Servico[];
  catalogoServicoId?: string;
  precoServico?: number;
}

export class OrdemServico {
  private constructor(
    public readonly id: string,
    public readonly numeroOS: string,
    public readonly clienteId: string,
    public readonly veiculoId: string,
    public readonly quilometragemEntrada: number,
    public readonly status: StatusOS,
    public readonly dataAbertura: Date,
    public readonly dataInicio: Date | undefined,
    public readonly dataConclusao: Date | undefined,
    public readonly observacoes: string | undefined,
    public readonly motivoCancelamento: string | undefined,
    public readonly temPagamento: boolean,
    public readonly servicos: readonly Servico[],
    public readonly catalogoServicoId: string | undefined,
    public readonly precoServico: number | undefined,
  ) {}

  static create(props: OrdemServicoProps): OrdemServico {
    OrdemServico.validate(props);
    return new OrdemServico(
      props.id ?? uuidv4(),
      props.numeroOS,
      props.clienteId,
      props.veiculoId,
      props.quilometragemEntrada,
      props.status ?? 'RECEBIDA',
      props.dataAbertura ?? new Date(),
      props.dataInicio,
      props.dataConclusao,
      props.observacoes,
      props.motivoCancelamento,
      props.temPagamento ?? false,
      props.servicos ?? [],
      props.catalogoServicoId,
      props.precoServico,
    );
  }

  get valorTotal(): number {
    const totalPecasEServicos = this.servicos.reduce((acc, s) => acc + s.valorTotal, 0);
    return totalPecasEServicos + (this.precoServico ?? 0);
  }

  adicionarServico(servico: Servico): OrdemServico {
    if (this.status === 'FINALIZADA' || this.status === 'ENTREGUE' || this.status === 'CANCELADA') {
      throw new ValidationError(
        'Não é possível adicionar serviços a uma OS finalizada, entregue ou cancelada',
      );
    }
    return this.copy({ servicos: [...this.servicos, servico] });
  }

  iniciar(): OrdemServico {
    if (this.status !== 'RECEBIDA') {
      throw new ValidationError('OS deve estar RECEBIDA para iniciar o diagnóstico');
    }
    return this.copy({ status: 'EM_DIAGNOSTICO', dataInicio: new Date() });
  }

  aguardarAprovacao(): OrdemServico {
    if (this.status !== 'EM_DIAGNOSTICO') {
      throw new ValidationError('OS deve estar EM_DIAGNOSTICO para aguardar aprovação');
    }
    return this.copy({ status: 'AGUARDANDO_APROVACAO' });
  }

  aprovar(): OrdemServico {
    if (this.status !== 'AGUARDANDO_APROVACAO') {
      throw new ValidationError('OS deve estar AGUARDANDO_APROVACAO para ser aprovada');
    }
    return this.copy({ status: 'EM_EXECUCAO' });
  }

  concluir(): OrdemServico {
    if (this.status !== 'EM_EXECUCAO') {
      throw new ValidationError('OS deve estar EM_EXECUCAO para ser finalizada');
    }
    return this.copy({ status: 'FINALIZADA', dataConclusao: new Date() });
  }

  entregar(): OrdemServico {
    if (this.status !== 'FINALIZADA') {
      throw new ValidationError('OS deve estar FINALIZADA para ser entregue');
    }
    return this.copy({ status: 'ENTREGUE' });
  }

  cancelar(motivo: string): OrdemServico {
    if (!motivo.trim()) throw new ValidationError('Motivo de cancelamento é obrigatório');
    if (this.status === 'FINALIZADA' || this.status === 'ENTREGUE')
      throw new ValidationError('OS finalizada ou entregue não pode ser cancelada');
    if (this.status === 'CANCELADA') throw new ValidationError('OS já está cancelada');
    if (this.temPagamento) throw new ValidationError('OS com pagamento não pode ser cancelada');
    return this.copy({ status: 'CANCELADA', motivoCancelamento: motivo });
  }

  registrarPagamento(): OrdemServico {
    if (this.status !== 'EM_EXECUCAO' && this.status !== 'FINALIZADA') {
      throw new ValidationError('Pagamento só pode ser registrado em OS em execução ou finalizada');
    }
    return this.copy({ temPagamento: true });
  }

  private copy(
    overrides: Partial<{
      status: StatusOS;
      dataInicio: Date;
      dataConclusao: Date;
      motivoCancelamento: string;
      temPagamento: boolean;
      servicos: Servico[];
    }>,
  ): OrdemServico {
    return new OrdemServico(
      this.id,
      this.numeroOS,
      this.clienteId,
      this.veiculoId,
      this.quilometragemEntrada,
      overrides.status ?? this.status,
      this.dataAbertura,
      overrides.dataInicio ?? this.dataInicio,
      overrides.dataConclusao ?? this.dataConclusao,
      this.observacoes,
      overrides.motivoCancelamento ?? this.motivoCancelamento,
      overrides.temPagamento ?? this.temPagamento,
      overrides.servicos ?? [...this.servicos],
      this.catalogoServicoId,
      this.precoServico,
    );
  }

  private static validate(props: OrdemServicoProps): void {
    if (!props.numeroOS.trim()) throw new ValidationError('numeroOS é obrigatório');
    if (!props.clienteId.trim()) throw new ValidationError('clienteId é obrigatório');
    if (!props.veiculoId.trim()) throw new ValidationError('veiculoId é obrigatório');
    if (props.quilometragemEntrada < 0)
      throw new ValidationError('Quilometragem de entrada não pode ser negativa');
  }
}
