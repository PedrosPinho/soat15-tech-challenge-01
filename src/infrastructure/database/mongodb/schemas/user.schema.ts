import { Schema, model, Document } from 'mongoose';

export interface UserDocument extends Document<string> {
  nome: string;
  email: string;
  senhaHash: string;
  ativo: boolean;
  criadoEm: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    senhaHash: { type: String, required: true },
    ativo: { type: Boolean, default: true },
    criadoEm: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: false },
);

export const UserModel = model<UserDocument>('User', userSchema);
