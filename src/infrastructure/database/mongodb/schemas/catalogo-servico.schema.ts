import mongoose, { Schema, Document } from 'mongoose';

export interface CatalogoServicoDocument extends Document<string> {
  descricao: string;
  preco: number;
  tempoEstimado: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

const catalogoServicoSchema = new Schema<CatalogoServicoDocument>(
  {
    _id: { type: String, required: true },
    descricao: { type: String, required: true },
    preco: { type: Number, required: true },
    tempoEstimado: { type: Number, required: true },
    ativo: { type: Boolean, default: true },
    criadoEm: { type: Date, default: Date.now },
    atualizadoEm: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: false },
);

catalogoServicoSchema.index({ descricao: 'text' });
catalogoServicoSchema.index({ ativo: 1 });

export const CatalogoServicoModel = mongoose.model<CatalogoServicoDocument>(
  'CatalogoServico',
  catalogoServicoSchema,
);
