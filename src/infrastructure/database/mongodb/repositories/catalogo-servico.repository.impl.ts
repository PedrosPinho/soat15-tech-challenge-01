import { CatalogoServico } from '@domain/entities/catalogo-servico.entity';
import {
  ICatalogoServicoRepository,
  ListCatalogoServicoFilter,
  ListCatalogoServicoResult,
} from '@domain/repositories/catalogo-servico.repository';
import { CatalogoServicoDocument, CatalogoServicoModel } from '../schemas/catalogo-servico.schema';

export class MongoCatalogoServicoRepository implements ICatalogoServicoRepository {
  async save(servico: CatalogoServico): Promise<void> {
    await CatalogoServicoModel.create(this.toPersistence(servico));
  }

  async findById(id: string): Promise<CatalogoServico | null> {
    const doc = await CatalogoServicoModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async list(
    page: number,
    limit: number,
    filter?: ListCatalogoServicoFilter,
  ): Promise<ListCatalogoServicoResult> {
    const query: Record<string, unknown> = {};
    if (filter?.ativo !== undefined) query['ativo'] = filter.ativo;
    if (filter?.search) query['$text'] = { $search: filter.search };

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      CatalogoServicoModel.find(query).skip(skip).limit(limit).sort({ descricao: 1 }),
      CatalogoServicoModel.countDocuments(query),
    ]);
    return { servicos: docs.map((d) => this.toDomain(d)), total };
  }

  async update(servico: CatalogoServico): Promise<void> {
    await CatalogoServicoModel.findByIdAndUpdate(servico.id, this.toPersistence(servico));
  }

  private toDomain(doc: CatalogoServicoDocument): CatalogoServico {
    return CatalogoServico.create({
      id: doc._id as string,
      descricao: doc.descricao,
      preco: doc.preco,
      tempoEstimado: doc.tempoEstimado,
      ativo: doc.ativo,
    });
  }

  private toPersistence(servico: CatalogoServico): Record<string, unknown> {
    return {
      _id: servico.id,
      descricao: servico.descricao,
      preco: servico.preco,
      tempoEstimado: servico.tempoEstimado,
      ativo: servico.ativo,
      atualizadoEm: new Date(),
    };
  }
}
