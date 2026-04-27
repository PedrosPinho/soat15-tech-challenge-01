import bcrypt from 'bcryptjs';

export class HashService {
  constructor(private readonly rounds: number = 10) {}

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  static fromEnv(): HashService {
    return new HashService(parseInt(process.env.BCRYPT_ROUNDS ?? '10'));
  }
}
