import { Cliente } from '@domain/entities/cliente.entity';

export interface ListClientesResult {
  clientes: Cliente[];
  total: number;
}

export interface IClienteRepository {
  save(cliente: Cliente): Promise<void>;
  findById(id: string): Promise<Cliente | null>;
  findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null>;
  findByEmail(email: string): Promise<Cliente | null>;
  list(page: number, limit: number): Promise<ListClientesResult>;
  update(cliente: Cliente): Promise<void>;
  delete(id: string): Promise<void>;
}
