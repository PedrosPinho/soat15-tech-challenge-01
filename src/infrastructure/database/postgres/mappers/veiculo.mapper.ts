import { Veiculo } from '@domain/entities/veiculo.entity';

export interface VeiculoRow {
  id: string;
  cliente_id: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  quilometragem: number;
  cor: string | null;
  chassi: string | null;
  renavam: string | null;
  observacoes: string | null;
  criado_em: Date;
}

export const toDomainVeiculo = (row: VeiculoRow): Veiculo =>
  Veiculo.create({
    id: row.id,
    clienteId: row.cliente_id,
    placa: row.placa,
    marca: row.marca,
    modelo: row.modelo,
    ano: row.ano,
    quilometragem: row.quilometragem,
    cor: row.cor ?? undefined,
    chassi: row.chassi ?? undefined,
    renavam: row.renavam ?? undefined,
    observacoes: row.observacoes ?? undefined,
    criadoEm: row.criado_em,
  });
