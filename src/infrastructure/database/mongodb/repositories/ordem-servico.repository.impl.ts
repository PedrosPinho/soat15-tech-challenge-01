import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { Servico } from '@domain/entities/servico.entity';
import {
  IOrdemServicoRepository,
  ListOrdemServicoFilter,
  ListOrdemServicoResult,
} from '@domain/repositories/ordem-servico.repository';
import {
  OrdemServicoDocument,
  OrdemServicoModel,
  OSCounterModel,
} from '../schemas/ordem-servico.schema';

export class MongoOrdemServicoRepository implements IOrdemServicoRepository {
  async save(os: OrdemServico): Promise<void> {
    await OrdemServicoModel.create(this.toPersistence(os));
  }

  async findById(id: string): Promise<OrdemServico | null> {
    const doc = await OrdemServicoModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findByNumeroOS(numeroOS: string): Promise<OrdemServico | null> {
    const doc = await OrdemServicoModel.findOne({ numeroOS });
    return doc ? this.toDomain(doc) : null;
  }

  async findByClienteId(
    clienteId: string,
    page: number,
    limit: number,
  ): Promise<ListOrdemServicoResult> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      OrdemServicoModel.find({ clienteId }).skip(skip).limit(limit).sort({ dataAbertura: -1 }),
      OrdemServicoModel.countDocuments({ clienteId }),
    ]);
    return { ordens: docs.map((d) => this.toDomain(d)), total };
  }

  async list(
    page: number,
    limit: number,
    filter?: ListOrdemServicoFilter,
  ): Promise<ListOrdemServicoResult> {
    const query: Record<string, unknown> = {};
    if (filter?.status) query['status'] = filter.status;
    if (filter?.clienteId) query['clienteId'] = filter.clienteId;
    if (filter?.veiculoId) query['veiculoId'] = filter.veiculoId;

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      OrdemServicoModel.find(query).skip(skip).limit(limit).sort({ dataAbertura: -1 }),
      OrdemServicoModel.countDocuments(query),
    ]);
    return { ordens: docs.map((d) => this.toDomain(d)), total };
  }

  async update(os: OrdemServico): Promise<void> {
    await OrdemServicoModel.findByIdAndUpdate(os.id, this.toPersistence(os));
  }

  async nextSequence(dateKey: string): Promise<number> {
    const counter = await OSCounterModel.findByIdAndUpdate(
      dateKey,
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    return counter.seq;
  }

  private toDomain(doc: OrdemServicoDocument): OrdemServico {
    const servicos = (doc.servicos ?? []).map((s) =>
      Servico.create({
        id: s._id,
        descricao: s.descricao,
        status: s.status as 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO',
        tempoEstimadoMinutos: s.tempoEstimadoMinutos,
        tempoRealMinutos: s.tempoRealMinutos,
        valorMaoDeObra: s.valorMaoDeObra,
        pecasUtilizadas: s.pecasUtilizadas,
        observacoes: s.observacoes,
      }),
    );

    return OrdemServico.create({
      id: doc._id as string,
      numeroOS: doc.numeroOS,
      clienteId: doc.clienteId,
      veiculoId: doc.veiculoId,
      quilometragemEntrada: doc.quilometragemEntrada,
      status: doc.status,
      dataAbertura: doc.dataAbertura,
      dataInicio: doc.dataInicio,
      dataConclusao: doc.dataConclusao,
      observacoes: doc.observacoes,
      motivoCancelamento: doc.motivoCancelamento,
      temPagamento: doc.temPagamento,
      servicos,
      catalogoServicoId: doc.catalogoServicoId,
      precoServico: doc.precoServico,
    });
  }

  private toPersistence(os: OrdemServico): Record<string, unknown> {
    return {
      _id: os.id,
      numeroOS: os.numeroOS,
      clienteId: os.clienteId,
      veiculoId: os.veiculoId,
      quilometragemEntrada: os.quilometragemEntrada,
      status: os.status,
      dataAbertura: os.dataAbertura,
      dataInicio: os.dataInicio,
      dataConclusao: os.dataConclusao,
      observacoes: os.observacoes,
      motivoCancelamento: os.motivoCancelamento,
      temPagamento: os.temPagamento,
      catalogoServicoId: os.catalogoServicoId,
      precoServico: os.precoServico,
      servicos: os.servicos.map((s) => ({
        _id: s.id,
        descricao: s.descricao,
        status: s.status,
        tempoEstimadoMinutos: s.tempoEstimadoMinutos,
        tempoRealMinutos: s.tempoRealMinutos,
        valorMaoDeObra: s.valorMaoDeObra,
        pecasUtilizadas: [...s.pecasUtilizadas],
        observacoes: s.observacoes,
      })),
    };
  }
}
