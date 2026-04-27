import { Schema, model, Document } from 'mongoose';

interface EnderecoDoc {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface ClienteDocument extends Document<string> {
  nome: string;
  cpfCnpj: string;
  tipo: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  telefone: string;
  email: string;
  endereco: EnderecoDoc;
  dataCadastro: Date;
  ativo: boolean;
}

const enderecoSchema = new Schema<EnderecoDoc>(
  {
    logradouro: { type: String, required: true },
    numero: { type: String, required: true },
    complemento: { type: String },
    bairro: { type: String, required: true },
    cidade: { type: String, required: true },
    estado: { type: String, required: true },
    cep: { type: String, required: true },
  },
  { _id: false },
);

const clienteSchema = new Schema<ClienteDocument>(
  {
    _id: { type: String, required: true },
    nome: { type: String, required: true },
    cpfCnpj: { type: String, required: true, unique: true },
    tipo: { type: String, enum: ['PESSOA_FISICA', 'PESSOA_JURIDICA'], required: true },
    telefone: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    endereco: { type: enderecoSchema, required: true },
    dataCadastro: { type: Date, default: Date.now },
    ativo: { type: Boolean, default: true },
  },
  { _id: false, timestamps: false },
);

clienteSchema.index({ cpfCnpj: 1 }, { unique: true });
clienteSchema.index({ email: 1 }, { unique: true });

export const ClienteModel = model<ClienteDocument>('Cliente', clienteSchema);
