import { Veiculo } from '@domain/entities/veiculo.entity';

export interface ListVeiculosResult {
  veiculos: Veiculo[];
  total: number;
}

export interface IVeiculoRepository {
  save(veiculo: Veiculo): Promise<void>;
  findById(id: string): Promise<Veiculo | null>;
  findByPlaca(placa: string): Promise<Veiculo | null>;
  findByClienteId(clienteId: string, page: number, limit: number): Promise<ListVeiculosResult>;
  update(veiculo: Veiculo): Promise<void>;
  delete(id: string): Promise<void>;
}
