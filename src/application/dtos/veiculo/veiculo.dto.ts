export interface CreateVeiculoDto {
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
}

export interface UpdateVeiculoDto {
  quilometragem: number;
  cor?: string;
  observacoes?: string;
}

export interface ListVeiculosByClienteDto {
  clienteId: string;
  page?: number;
  limit?: number;
}

export interface VeiculoResponseDto {
  id: string;
  clienteId: string;
  placa: string;
  placaFormatada: string;
  marca: string;
  modelo: string;
  ano: number;
  quilometragem: number;
  cor?: string;
  chassi?: string;
  renavam?: string;
  observacoes?: string;
  criadoEm: Date;
}

export interface ListVeiculosResponseDto {
  veiculos: VeiculoResponseDto[];
  total: number;
  page: number;
  limit: number;
}
