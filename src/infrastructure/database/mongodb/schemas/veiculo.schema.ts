import mongoose, { Document, Schema } from 'mongoose';

export interface VeiculoDocument extends Document<string> {
  _id: string;
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  quilometragem: number;
  cor?: string;
  chassi?: string;
  renavam?: string;
  observacoes?: string;
  criadoEm: Date;
}

const veiculoSchema = new Schema<VeiculoDocument>(
  {
    _id: { type: String, required: true },
    clienteId: { type: String, required: true, index: true },
    placa: { type: String, required: true, unique: true },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    ano: { type: Number, required: true },
    quilometragem: { type: Number, required: true, default: 0 },
    cor: { type: String },
    chassi: { type: String, sparse: true, unique: true },
    renavam: { type: String },
    observacoes: { type: String },
    criadoEm: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false, _id: false },
);

export const VeiculoModel = mongoose.model<VeiculoDocument>('Veiculo', veiculoSchema);
