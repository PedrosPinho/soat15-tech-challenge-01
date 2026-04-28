import mongoose, { Document, Schema } from 'mongoose';
import { FormaPagamento, StatusPagamento } from '@domain/entities/pagamento.entity';

export interface PagamentoDocument extends Document<string> {
  _id: string;
  ordemServicoId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  status: StatusPagamento;
  dataPagamento?: Date;
  observacoes?: string;
  criadoEm: Date;
}

const pagamentoSchema = new Schema<PagamentoDocument>(
  {
    _id: { type: String, required: true },
    ordemServicoId: { type: String, required: true },
    valor: { type: Number, required: true },
    formaPagamento: {
      type: String,
      required: true,
      enum: ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA'],
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDENTE', 'CONFIRMADO', 'CANCELADO'],
      default: 'PENDENTE',
    },
    dataPagamento: { type: Date },
    observacoes: { type: String },
    criadoEm: { type: Date, required: true },
  },
  { timestamps: false, _id: false },
);

pagamentoSchema.index({ ordemServicoId: 1 });
pagamentoSchema.index({ status: 1 });

export const PagamentoModel = mongoose.model<PagamentoDocument>('Pagamento', pagamentoSchema);
