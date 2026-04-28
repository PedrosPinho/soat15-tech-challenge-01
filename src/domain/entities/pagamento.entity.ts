import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors/domain.error';

export type FormaPagamento = 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'TRANSFERENCIA';
export type StatusPagamento = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';

export interface PagamentoProps {
  id?: string;
  ordemServicoId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  status?: StatusPagamento;
  dataPagamento?: Date;
  observacoes?: string;
  criadoEm?: Date;
}

export class Pagamento {
  private constructor(
    public readonly id: string,
    public readonly ordemServicoId: string,
    public readonly valor: number,
    public readonly formaPagamento: FormaPagamento,
    public readonly status: StatusPagamento,
    public readonly dataPagamento: Date | undefined,
    public readonly observacoes: string | undefined,
    public readonly criadoEm: Date,
  ) {}

  static create(props: PagamentoProps): Pagamento {
    Pagamento.validate(props);
    return new Pagamento(
      props.id ?? uuidv4(),
      props.ordemServicoId,
      props.valor,
      props.formaPagamento,
      props.status ?? 'PENDENTE',
      props.dataPagamento,
      props.observacoes,
      props.criadoEm ?? new Date(),
    );
  }

  confirmar(): Pagamento {
    if (this.status === 'CONFIRMADO') throw new ValidationError('Pagamento já foi confirmado');
    if (this.status === 'CANCELADO') throw new ValidationError('Pagamento cancelado não pode ser confirmado');
    return this.copy({ status: 'CONFIRMADO', dataPagamento: new Date() });
  }

  cancelar(): Pagamento {
    if (this.status === 'CANCELADO') throw new ValidationError('Pagamento já está cancelado');
    if (this.status === 'CONFIRMADO') throw new ValidationError('Pagamento confirmado não pode ser cancelado');
    return this.copy({ status: 'CANCELADO' });
  }

  private copy(overrides: Partial<{ status: StatusPagamento; dataPagamento: Date }>): Pagamento {
    return new Pagamento(
      this.id,
      this.ordemServicoId,
      this.valor,
      this.formaPagamento,
      overrides.status ?? this.status,
      overrides.dataPagamento ?? this.dataPagamento,
      this.observacoes,
      this.criadoEm,
    );
  }

  private static validate(props: PagamentoProps): void {
    if (!props.ordemServicoId.trim()) throw new ValidationError('ordemServicoId é obrigatório');
    if (props.valor <= 0) throw new ValidationError('Valor deve ser maior que zero');
  }
}
