import { Peca } from '@domain/entities/peca.entity';
import { IPecaRepository, ListPecasFilter, ListPecasResult } from '@domain/repositories/peca.repository';
import { PecaModel, PecaDocument } from '../schemas/peca.schema';

export class MongoPecaRepository implements IPecaRepository {
  async save(peca: Peca): Promise<void> {
    await PecaModel.create(this.toPersistence(peca));
  }

  async findById(id: string): Promise<Peca | null> {
    const doc = await PecaModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findByCodigo(codigo: string): Promise<Peca | null> {
    const doc = await PecaModel.findOne({ codigo });
    return doc ? this.toDomain(doc) : null;
  }

  async list(page: number, limit: number, filter?: ListPecasFilter): Promise<ListPecasResult> {
    const query: Record<string, unknown> = {};

    if (filter?.categoria) query['categoria'] = filter.categoria;
    if (filter?.ativo !== undefined) query['ativo'] = filter.ativo;
    if (filter?.search) query['$text'] = { $search: filter.search };

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      PecaModel.find(query).skip(skip).limit(limit).sort({ codigo: 1 }),
      PecaModel.countDocuments(query),
    ]);

    return { pecas: docs.map((d) => this.toDomain(d)), total };
  }

  async update(peca: Peca): Promise<void> {
    await PecaModel.findByIdAndUpdate(peca.id, this.toPersistence(peca));
  }

  async delete(id: string): Promise<void> {
    await PecaModel.findByIdAndUpdate(id, { ativo: false });
  }

  private toDomain(doc: PecaDocument): Peca {
    return Peca.create({
      id: doc._id as string,
      codigo: doc.codigo,
      descricao: doc.descricao,
      categoria: doc.categoria,
      precoCompra: doc.precoCompra,
      precoVenda: doc.precoVenda,
      unidadeMedida: doc.unidadeMedida,
      nivelMinimo: doc.nivelMinimo,
      nivelMaximo: doc.nivelMaximo,
      ativo: doc.ativo,
    });
  }

  private toPersistence(peca: Peca): Record<string, unknown> {
    return {
      _id: peca.id,
      codigo: peca.codigo,
      descricao: peca.descricao,
      categoria: peca.categoria,
      precoCompra: peca.precoCompra,
      precoVenda: peca.precoVenda,
      unidadeMedida: peca.unidadeMedida,
      nivelMinimo: peca.nivelMinimo,
      nivelMaximo: peca.nivelMaximo,
      ativo: peca.ativo,
    };
  }
}
