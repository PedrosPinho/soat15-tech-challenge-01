import { Cliente } from '@domain/entities/cliente.entity';

/**
 * Linha da tabela `clientes`. O VO `Endereco` do domínio é reconstruído a
 * partir das colunas achatadas (`logradouro`, `numero`, `complemento`,
 * `bairro`, `cidade`, `uf`, `cep`) — ver decisão em
 * docs/architecture/data-model.md ("endereço achatado em colunas").
 */
export interface ClienteRow {
  id: string;
  cpf_cnpj: string;
  tipo: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  nome: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  ativo: boolean;
  criado_em: Date;
}

export const toDomainCliente = (row: ClienteRow): Cliente =>
  Cliente.create({
    id: row.id,
    nome: row.nome,
    cpfCnpj: row.cpf_cnpj,
    tipo: row.tipo,
    telefone: row.telefone,
    email: row.email,
    endereco: {
      logradouro: row.logradouro,
      numero: row.numero,
      complemento: row.complemento ?? undefined,
      bairro: row.bairro,
      cidade: row.cidade,
      estado: row.uf,
      cep: row.cep,
    },
    dataCadastro: row.criado_em,
    ativo: row.ativo,
  });
