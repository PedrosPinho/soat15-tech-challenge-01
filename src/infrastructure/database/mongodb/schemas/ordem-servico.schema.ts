import mongoose, { Document, Schema } from 'mongoose';
import { StatusOS } from '@domain/entities/ordem-servico.entity';

export interface OrdemServicoDocument extends Document<string> {
  _id: string;
  numeroOS: string;
  clienteId: string;
  veiculoId: string;
  quilometragemEntrada: number;
  status: StatusOS;
  dataAbertura: Date;
  dataInicio?: Date;
  dataConclusao?: Date;
  observacoes?: string;
  motivoCancelamento?: string;
  temPagamento: boolean;
}

const ordemServicoSchema = new Schema<OrdemServicoDocument>(
  {
    _id: { type: String, required: true },
    numeroOS: { type: String, required: true, unique: true },
    clienteId: { type: String, required: true },
    veiculoId: { type: String, required: true },
    quilometragemEntrada: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'],
      default: 'ABERTA',
    },
    dataAbertura: { type: Date, required: true },
    dataInicio: { type: Date },
    dataConclusao: { type: Date },
    observacoes: { type: String },
    motivoCancelamento: { type: String },
    temPagamento: { type: Boolean, required: true, default: false },
  },
  { timestamps: false, _id: false },
);

ordemServicoSchema.index({ clienteId: 1 });
ordemServicoSchema.index({ veiculoId: 1 });
ordemServicoSchema.index({ status: 1 });

// Counter document for sequence generation per date
export interface OSCounterDocument extends Document<string> {
  _id: string;
  seq: number;
}

const osCounterSchema = new Schema<OSCounterDocument>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

export const OrdemServicoModel = mongoose.model<OrdemServicoDocument>('OrdemServico', ordemServicoSchema);
export const OSCounterModel = mongoose.model<OSCounterDocument>('OSCounter', osCounterSchema);
