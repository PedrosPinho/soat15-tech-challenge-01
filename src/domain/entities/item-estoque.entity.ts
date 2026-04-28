import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors/domain.error';

export interface ItemEstoqueProps {
  id?: string;
  pecaId: string;
  quantidadeDisponivel: number;
  quantidadeReservada?: number;
  nivelMinimo: number;
  nivelMaximo: number;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

export class ItemEstoque {
  private constructor(
    public readonly id: string,
    public readonly pecaId: string,
    public readonly quantidadeDisponivel: number,
    public readonly quantidadeReservada: number,
    public readonly nivelMinimo: number,
    public readonly nivelMaximo: number,
    public readonly criadoEm: Date,
    public readonly atualizadoEm: Date,
  ) {}

  static create(props: ItemEstoqueProps): ItemEstoque {
    ItemEstoque.validate(props);
    const now = new Date();
    return new ItemEstoque(
      props.id ?? uuidv4(),
      props.pecaId,
      props.quantidadeDisponivel,
      props.quantidadeReservada ?? 0,
      props.nivelMinimo,
      props.nivelMaximo,
      props.criadoEm ?? now,
      props.atualizadoEm ?? now,
    );
  }

  get totalEmEstoque(): number {
    return this.quantidadeDisponivel + this.quantidadeReservada;
  }

  get isAbaixoDoMinimo(): boolean {
    return this.totalEmEstoque < this.nivelMinimo;
  }

  reservar(quantidade: number): ItemEstoque {
    if (quantidade <= 0) throw new ValidationError('Quantidade deve ser maior que zero');
    if (quantidade > this.quantidadeDisponivel) throw new ValidationError('Estoque insuficiente');
    return this.copy({
      quantidadeDisponivel: this.quantidadeDisponivel - quantidade,
      quantidadeReservada: this.quantidadeReservada + quantidade,
    });
  }

  utilizar(quantidade: number): ItemEstoque {
    if (quantidade <= 0) throw new ValidationError('Quantidade deve ser maior que zero');
    if (quantidade > this.quantidadeReservada) throw new ValidationError('Quantidade a utilizar excede o reservado');
    return this.copy({ quantidadeReservada: this.quantidadeReservada - quantidade });
  }

  liberarReserva(quantidade: number): ItemEstoque {
    if (quantidade <= 0) throw new ValidationError('Quantidade deve ser maior que zero');
    if (quantidade > this.quantidadeReservada) throw new ValidationError('Quantidade a liberar excede o reservado');
    return this.copy({
      quantidadeDisponivel: this.quantidadeDisponivel + quantidade,
      quantidadeReservada: this.quantidadeReservada - quantidade,
    });
  }

  abastecer(quantidade: number): ItemEstoque {
    if (quantidade <= 0) throw new ValidationError('Quantidade deve ser maior que zero');
    return this.copy({ quantidadeDisponivel: this.quantidadeDisponivel + quantidade });
  }

  private copy(overrides: Partial<{
    quantidadeDisponivel: number;
    quantidadeReservada: number;
  }>): ItemEstoque {
    return new ItemEstoque(
      this.id,
      this.pecaId,
      overrides.quantidadeDisponivel ?? this.quantidadeDisponivel,
      overrides.quantidadeReservada ?? this.quantidadeReservada,
      this.nivelMinimo,
      this.nivelMaximo,
      this.criadoEm,
      new Date(),
    );
  }

  private static validate(props: ItemEstoqueProps): void {
    if (props.quantidadeDisponivel < 0) throw new ValidationError('quantidadeDisponivel não pode ser negativa');
    if ((props.quantidadeReservada ?? 0) < 0) throw new ValidationError('quantidadeReservada não pode ser negativa');
    if (props.nivelMinimo < 0) throw new ValidationError('nivelMinimo não pode ser negativo');
    if (props.nivelMaximo <= props.nivelMinimo) throw new ValidationError('nivelMaximo deve ser maior que nivelMinimo');
  }
}
