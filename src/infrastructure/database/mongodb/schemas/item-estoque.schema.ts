import mongoose, { Document, Schema } from 'mongoose';

export interface ItemEstoqueDocument extends Document<string> {
  _id: string;
  pecaId: string;
  quantidadeDisponivel: number;
  quantidadeReservada: number;
  nivelMinimo: number;
  nivelMaximo: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

const itemEstoqueSchema = new Schema<ItemEstoqueDocument>(
  {
    _id: { type: String, required: true },
    pecaId: { type: String, required: true, unique: true },
    quantidadeDisponivel: { type: Number, required: true, default: 0 },
    quantidadeReservada: { type: Number, required: true, default: 0 },
    nivelMinimo: { type: Number, required: true },
    nivelMaximo: { type: Number, required: true },
    criadoEm: { type: Date, required: true },
    atualizadoEm: { type: Date, required: true },
  },
  { timestamps: false, _id: false },
);

itemEstoqueSchema.index({ pecaId: 1 });

export const ItemEstoqueModel = mongoose.model<ItemEstoqueDocument>(
  'ItemEstoque',
  itemEstoqueSchema,
);
