import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';
import { UserModel } from '@infrastructure/database/mongodb/schemas/user.schema';

export class MongoUserRepository implements IUserRepository {
  async save(user: User): Promise<void> {
    await UserModel.create({
      _id: user.id,
      nome: user.nome,
      email: user.email,
      senhaHash: user.senhaHash,
      ativo: user.ativo,
      criadoEm: user.criadoEm,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() });
    if (!doc) return null;
    return User.create({
      id: doc._id,
      nome: doc.nome,
      email: doc.email,
      senhaHash: doc.senhaHash,
      ativo: doc.ativo,
      criadoEm: doc.criadoEm,
    });
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    if (!doc) return null;
    return User.create({
      id: doc._id,
      nome: doc.nome,
      email: doc.email,
      senhaHash: doc.senhaHash,
      ativo: doc.ativo,
      criadoEm: doc.criadoEm,
    });
  }
}
