export interface CreateClienteDto {
  nome: string;
  cpfCnpj: string;
  tipo: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  telefone: string;
  email: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
}

export interface UpdateClienteDto {
  telefone: string;
  email: string;
}

export interface ListClientesDto {
  page?: number;
  limit?: number;
}

export interface ClienteResponseDto {
  id: string;
  nome: string;
  cpfCnpj: string;
  tipo: string;
  telefone: string;
  email: string;
  ativo: boolean;
  dataCadastro: Date;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
}

export interface ListClientesResponseDto {
  clientes: ClienteResponseDto[];
  total: number;
  page: number;
  limit: number;
}
