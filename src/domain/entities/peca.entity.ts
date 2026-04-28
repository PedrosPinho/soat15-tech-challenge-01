import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors/domain.error';

export type CategoriaPeca =
  | 'MOTOR'
  | 'TRANSMISSAO'
  | 'SUSPENSAO'
  | 'FREIOS'
  | 'ELETRICA'
  | 'FLUIDOS'
  | 'FILTROS'
  | 'OUTROS';

export type UnidadeMedida = 'UNIDADE' | 'LITRO' | 'METRO' | 'KG';

export interface PecaProps {
  id?: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaPeca;
  precoCompra: number;
  precoVenda: number;
  unidadeMedida: UnidadeMedida;
  nivelMinimo: number;
  nivelMaximo: number;
  ativo?: boolean;
}

export class Peca {
  private constructor(
    public readonly id: string,
    public readonly codigo: string,
    public readonly descricao: string,
    public readonly categoria: CategoriaPeca,
    public readonly precoCompra: number,
    public readonly precoVenda: number,
    public readonly unidadeMedida: UnidadeMedida,
    public readonly nivelMinimo: number,
    public readonly nivelMaximo: number,
    public readonly ativo: boolean,
  ) {}

  static create(props: PecaProps): Peca {
    Peca.validate(props);
    return new Peca(
      props.id ?? uuidv4(),
      props.codigo,
      props.descricao,
      props.categoria,
      props.precoCompra,
      props.precoVenda,
      props.unidadeMedida,
      props.nivelMinimo,
      props.nivelMaximo,
      props.ativo ?? true,
    );
  }

  get margemLucro(): number {
    if (this.precoCompra === 0) return 0;
    return ((this.precoVenda - this.precoCompra) / this.precoCompra) * 100;
  }

  atualizarPreco(novoPrecoCompra: number, novoPrecoVenda: number): Peca {
    if (novoPrecoVenda < novoPrecoCompra) {
      throw new ValidationError('Preço de venda não pode ser menor que o preço de compra');
    }
    return new Peca(
      this.id,
      this.codigo,
      this.descricao,
      this.categoria,
      novoPrecoCompra,
      novoPrecoVenda,
      this.unidadeMedida,
      this.nivelMinimo,
      this.nivelMaximo,
      this.ativo,
    );
  }

  desativar(): Peca {
    return new Peca(
      this.id,
      this.codigo,
      this.descricao,
      this.categoria,
      this.precoCompra,
      this.precoVenda,
      this.unidadeMedida,
      this.nivelMinimo,
      this.nivelMaximo,
      false,
    );
  }

  private static validate(props: PecaProps): void {
    if (!props.codigo.trim()) throw new ValidationError('Código é obrigatório');

    if (props.descricao.length < 5) {
      throw new ValidationError('Descrição deve ter pelo menos 5 caracteres');
    }
    if (props.descricao.length > 200) {
      throw new ValidationError('Descrição deve ter no máximo 200 caracteres');
    }

    if (props.precoCompra < 0) throw new ValidationError('Preço de compra não pode ser negativo');
    if (props.precoVenda < props.precoCompra) {
      throw new ValidationError('Preço de venda não pode ser menor que o preço de compra');
    }

    if (props.nivelMinimo < 0) throw new ValidationError('Nível mínimo não pode ser negativo');
    if (props.nivelMaximo <= props.nivelMinimo) {
      throw new ValidationError('Nível máximo deve ser maior que o nível mínimo');
    }
  }
}
