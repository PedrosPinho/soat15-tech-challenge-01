import { Cliente } from '@domain/entities/cliente.entity';
import { ClienteResponseDto } from '@application/dtos/cliente/cliente.dto';

export class ClienteMapper {
  static toDto(cliente: Cliente): ClienteResponseDto {
    return {
      id: cliente.id,
      nome: cliente.nome,
      cpfCnpj: cliente.cpfCnpj.value,
      tipo: cliente.tipo,
      telefone: cliente.telefone,
      email: cliente.email,
      ativo: cliente.ativo,
      dataCadastro: cliente.dataCadastro,
      endereco: {
        logradouro: cliente.endereco.logradouro,
        numero: cliente.endereco.numero,
        complemento: cliente.endereco.complemento,
        bairro: cliente.endereco.bairro,
        cidade: cliente.endereco.cidade,
        estado: cliente.endereco.estado,
        cep: cliente.endereco.cep,
      },
    };
  }
}
