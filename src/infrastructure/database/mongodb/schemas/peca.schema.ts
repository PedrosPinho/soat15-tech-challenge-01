import mongoose, { Document, Schema } from 'mongoose';
import { CategoriaPeca, UnidadeMedida } from '@domain/entities/peca.entity';

export interface PecaDocument extends Document<string> {
  _id: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaPeca;
  precoCompra: number;
  precoVenda: number;
  unidadeMedida: UnidadeMedida;
  nivelMinimo: number;
  nivelMaximo: number;
  ativo: boolean;
}

const pecaSchema = new Schema<PecaDocument>(
  {
    _id: { type: String, required: true },
    codigo: { type: String, required: true, unique: true },
    descricao: { type: String, required: true },
    categoria: {
      type: String,
      required: true,
      enum: [
        'MOTOR',
        'TRANSMISSAO',
        'SUSPENSAO',
        'FREIOS',
        'ELETRICA',
        'FLUIDOS',
        'FILTROS',
        'OUTROS',
      ],
    },
    precoCompra: { type: Number, required: true },
    precoVenda: { type: Number, required: true },
    unidadeMedida: {
      type: String,
      required: true,
      enum: ['UNIDADE', 'LITRO', 'METRO', 'KG'],
    },
    nivelMinimo: { type: Number, required: true },
    nivelMaximo: { type: Number, required: true },
    ativo: { type: Boolean, required: true, default: true },
  },
  { timestamps: false, _id: false },
);

pecaSchema.index({ categoria: 1 });
pecaSchema.index({ descricao: 'text' });

export const PecaModel = mongoose.model<PecaDocument>('Peca', pecaSchema);
