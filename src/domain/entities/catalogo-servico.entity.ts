import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors/domain.error';

export interface CatalogoServicoProps {
  id?: string;
  descricao: string;
  preco: number;
  tempoEstimado: number;
  ativo?: boolean;
}

export class CatalogoServico {
  private constructor(
    public readonly id: string,
    public readonly descricao: string,
    public readonly preco: number,
    public readonly tempoEstimado: number,
    public readonly ativo: boolean,
  ) {}

  static create(props: CatalogoServicoProps): CatalogoServico {
    CatalogoServico.validate(props);
    return new CatalogoServico(
      props.id ?? uuidv4(),
      props.descricao.trim(),
      props.preco,
      props.tempoEstimado,
      props.ativo ?? true,
    );
  }

  editar(
    changes: Partial<Pick<CatalogoServicoProps, 'descricao' | 'preco' | 'tempoEstimado'>>,
  ): CatalogoServico {
    const updated = {
      descricao: changes.descricao ?? this.descricao,
      preco: changes.preco ?? this.preco,
      tempoEstimado: changes.tempoEstimado ?? this.tempoEstimado,
    };
    CatalogoServico.validate(updated);
    return new CatalogoServico(
      this.id,
      updated.descricao.trim(),
      updated.preco,
      updated.tempoEstimado,
      this.ativo,
    );
  }

  deletar(): CatalogoServico {
    return new CatalogoServico(this.id, this.descricao, this.preco, this.tempoEstimado, false);
  }

  private static validate(
    props: Pick<CatalogoServicoProps, 'descricao' | 'preco' | 'tempoEstimado'>,
  ): void {
    if (!props.descricao?.trim()) throw new ValidationError('Descrição é obrigatória');
    if (props.preco < 0) throw new ValidationError('Preço não pode ser negativo');
    if (props.tempoEstimado <= 0)
      throw new ValidationError('Tempo estimado deve ser maior que zero');
  }
}
