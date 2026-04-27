import { Cliente } from '@domain/entities/cliente.entity';
import { IClienteRepository, ListClientesResult } from '@domain/repositories/cliente.repository';
import { ClienteModel, ClienteDocument } from '../schemas/cliente.schema';

export class MongoClienteRepository implements IClienteRepository {
  async save(cliente: Cliente): Promise<void> {
    await ClienteModel.create(this.toPersistence(cliente));
  }

  async findById(id: string): Promise<Cliente | null> {
    const doc = await ClienteModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Cliente | null> {
    const doc = await ClienteModel.findOne({ cpfCnpj });
    return doc ? this.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<Cliente | null> {
    const doc = await ClienteModel.findOne({ email: email.toLowerCase() });
    return doc ? this.toDomain(doc) : null;
  }

  async list(page: number, limit: number): Promise<ListClientesResult> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      ClienteModel.find({ ativo: true }).skip(skip).limit(limit).sort({ nome: 1 }),
      ClienteModel.countDocuments({ ativo: true }),
    ]);
    return { clientes: docs.map((d) => this.toDomain(d)), total };
  }

  async update(cliente: Cliente): Promise<void> {
    await ClienteModel.findByIdAndUpdate(cliente.id, this.toPersistence(cliente));
  }

  async delete(id: string): Promise<void> {
    await ClienteModel.findByIdAndUpdate(id, { ativo: false });
  }

  private toDomain(doc: ClienteDocument): Cliente {
    return Cliente.create({
      id: doc._id as string,
      nome: doc.nome,
      cpfCnpj: doc.cpfCnpj,
      tipo: doc.tipo,
      telefone: doc.telefone,
      email: doc.email,
      endereco: doc.endereco,
      dataCadastro: doc.dataCadastro,
      ativo: doc.ativo,
    });
  }

  private toPersistence(cliente: Cliente): Record<string, unknown> {
    return {
      _id: cliente.id,
      nome: cliente.nome,
      cpfCnpj: cliente.cpfCnpj.value,
      tipo: cliente.tipo,
      telefone: cliente.telefone,
      email: cliente.email,
      endereco: {
        logradouro: cliente.endereco.logradouro,
        numero: cliente.endereco.numero,
        complemento: cliente.endereco.complemento,
        bairro: cliente.endereco.bairro,
        cidade: cliente.endereco.cidade,
        estado: cliente.endereco.estado,
        cep: cliente.endereco.cep,
      },
      dataCadastro: cliente.dataCadastro,
      ativo: cliente.ativo,
    };
  }
}
