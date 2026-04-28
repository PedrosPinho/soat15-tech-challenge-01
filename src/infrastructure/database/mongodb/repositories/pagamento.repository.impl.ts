import { Pagamento } from '@domain/entities/pagamento.entity';
import {
  IPagamentoRepository,
  ListPagamentosFilter,
  IFindPagamentosResult,
} from '@domain/repositories/pagamento.repository';
import { PagamentoDocument, PagamentoModel } from '../schemas/pagamento.schema';

export class MongoPagamentoRepository implements IPagamentoRepository {
  async save(pagamento: Pagamento): Promise<void> {
    await PagamentoModel.create(this.toPersistence(pagamento));
  }

  async findById(id: string): Promise<Pagamento | null> {
    const doc = await PagamentoModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findByOrdemServicoId(ordemServicoId: string): Promise<Pagamento[]> {
    const docs = await PagamentoModel.find({ ordemServicoId });
    return docs.map((d) => this.toDomain(d));
  }

  async list(page: number, limit: number, filter?: ListPagamentosFilter): Promise<IFindPagamentosResult> {
    const query: Record<string, unknown> = {};
    if (filter?.ordemServicoId) query['ordemServicoId'] = filter.ordemServicoId;
    if (filter?.status) query['status'] = filter.status;

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      PagamentoModel.find(query).skip(skip).limit(limit).sort({ criadoEm: -1 }),
      PagamentoModel.countDocuments(query),
    ]);
    return { pagamentos: docs.map((d) => this.toDomain(d)), total };
  }

  async update(pagamento: Pagamento): Promise<void> {
    await PagamentoModel.findByIdAndUpdate(pagamento.id, this.toPersistence(pagamento));
  }

  async sumConfirmados(): Promise<number> {
    const result = await PagamentoModel.aggregate<{ total: number }>([
      { $match: { status: 'CONFIRMADO' } },
      { $group: { _id: null, total: { $sum: '$valor' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  private toDomain(doc: PagamentoDocument): Pagamento {
    return Pagamento.create({
      id: doc._id as string,
      ordemServicoId: doc.ordemServicoId,
      valor: doc.valor,
      formaPagamento: doc.formaPagamento,
      status: doc.status,
      dataPagamento: doc.dataPagamento,
      observacoes: doc.observacoes,
      criadoEm: doc.criadoEm,
    });
  }

  private toPersistence(pagamento: Pagamento): Record<string, unknown> {
    return {
      _id: pagamento.id,
      ordemServicoId: pagamento.ordemServicoId,
      valor: pagamento.valor,
      formaPagamento: pagamento.formaPagamento,
      status: pagamento.status,
      dataPagamento: pagamento.dataPagamento,
      observacoes: pagamento.observacoes,
      criadoEm: pagamento.criadoEm,
    };
  }
}
