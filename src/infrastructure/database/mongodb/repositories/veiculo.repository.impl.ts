import { Veiculo } from '@domain/entities/veiculo.entity';
import { IVeiculoRepository, ListVeiculosResult } from '@domain/repositories/veiculo.repository';
import { VeiculoModel, VeiculoDocument } from '../schemas/veiculo.schema';

export class MongoVeiculoRepository implements IVeiculoRepository {
  async save(veiculo: Veiculo): Promise<void> {
    await VeiculoModel.create(this.toPersistence(veiculo));
  }

  async findById(id: string): Promise<Veiculo | null> {
    const doc = await VeiculoModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findByPlaca(placa: string): Promise<Veiculo | null> {
    const doc = await VeiculoModel.findOne({ placa: placa.toUpperCase() });
    return doc ? this.toDomain(doc) : null;
  }

  async findByClienteId(clienteId: string, page: number, limit: number): Promise<ListVeiculosResult> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      VeiculoModel.find({ clienteId }).skip(skip).limit(limit).sort({ criadoEm: -1 }),
      VeiculoModel.countDocuments({ clienteId }),
    ]);
    return { veiculos: docs.map((d) => this.toDomain(d)), total };
  }

  async update(veiculo: Veiculo): Promise<void> {
    await VeiculoModel.findByIdAndUpdate(veiculo.id, this.toPersistence(veiculo));
  }

  async delete(id: string): Promise<void> {
    await VeiculoModel.findByIdAndDelete(id);
  }

  private toDomain(doc: VeiculoDocument): Veiculo {
    return Veiculo.create({
      id: doc._id as string,
      clienteId: doc.clienteId,
      placa: doc.placa,
      marca: doc.marca,
      modelo: doc.modelo,
      ano: doc.ano,
      quilometragem: doc.quilometragem,
      cor: doc.cor,
      chassi: doc.chassi,
      renavam: doc.renavam,
      observacoes: doc.observacoes,
      criadoEm: doc.criadoEm,
    });
  }

  private toPersistence(veiculo: Veiculo): Record<string, unknown> {
    return {
      _id: veiculo.id,
      clienteId: veiculo.clienteId,
      placa: veiculo.placa.value,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      quilometragem: veiculo.quilometragem,
      cor: veiculo.cor,
      chassi: veiculo.chassi,
      renavam: veiculo.renavam,
      observacoes: veiculo.observacoes,
      criadoEm: veiculo.criadoEm,
    };
  }
}
