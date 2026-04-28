import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '@shared/errors/domain.error';
import { Placa } from '@domain/value-objects/placa.vo';

export interface VeiculoProps {
  id?: string;
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  quilometragem?: number;
  cor?: string;
  chassi?: string;
  renavam?: string;
  observacoes?: string;
  criadoEm?: Date;
}

export class Veiculo {
  public readonly placa: Placa;

  private constructor(
    public readonly id: string,
    public readonly clienteId: string,
    placa: Placa,
    public readonly marca: string,
    public readonly modelo: string,
    public readonly ano: number,
    public readonly quilometragem: number,
    public readonly cor: string | undefined,
    public readonly chassi: string | undefined,
    public readonly renavam: string | undefined,
    public readonly observacoes: string | undefined,
    public readonly criadoEm: Date,
  ) {
    this.placa = placa;
  }

  static create(props: VeiculoProps): Veiculo {
    const placa = Placa.create(props.placa);
    const quilometragem = props.quilometragem ?? 0;
    Veiculo.validate(props.marca, props.modelo, props.ano, quilometragem);

    return new Veiculo(
      props.id ?? uuidv4(),
      props.clienteId,
      placa,
      props.marca,
      props.modelo,
      props.ano,
      quilometragem,
      props.cor,
      props.chassi,
      props.renavam,
      props.observacoes,
      props.criadoEm ?? new Date(),
    );
  }

  atualizar(props: { quilometragem: number; cor?: string; observacoes?: string }): Veiculo {
    const comKm = this.atualizarQuilometragem(props.quilometragem);
    return new Veiculo(
      comKm.id, comKm.clienteId, comKm.placa, comKm.marca, comKm.modelo,
      comKm.ano, comKm.quilometragem,
      props.cor !== undefined ? props.cor : comKm.cor,
      comKm.chassi,
      comKm.renavam,
      props.observacoes !== undefined ? props.observacoes : comKm.observacoes,
      comKm.criadoEm,
    );
  }

  atualizarQuilometragem(km: number): Veiculo {
    if (km <= this.quilometragem) {
      throw new ValidationError(
        `Nova quilometragem (${km}) deve ser maior que a atual (${this.quilometragem})`,
      );
    }
    return new Veiculo(
      this.id, this.clienteId, this.placa, this.marca, this.modelo,
      this.ano, km, this.cor, this.chassi, this.renavam, this.observacoes, this.criadoEm,
    );
  }

  private static validate(marca: string, modelo: string, ano: number, quilometragem: number): void {
    if (marca.length < 2) throw new ValidationError('Marca deve ter pelo menos 2 caracteres');
    if (modelo.length < 2) throw new ValidationError('Modelo deve ter pelo menos 2 caracteres');

    const currentYear = new Date().getFullYear();
    if (ano < 1900) throw new ValidationError('Ano não pode ser anterior a 1900');
    if (ano > currentYear) throw new ValidationError(`Ano não pode ser futuro (máximo: ${currentYear})`);

    if (quilometragem < 0) throw new ValidationError('Quilometragem não pode ser negativa');
  }
}
