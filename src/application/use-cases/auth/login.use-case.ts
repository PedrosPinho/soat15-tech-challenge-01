import { IUserRepository } from '@domain/repositories/user.repository';
import { HashService } from '@infrastructure/security/hash.service';
import { JwtService } from '@infrastructure/security/jwt.service';
import { UnauthorizedError } from '@shared/errors/domain.error';

export interface LoginDTO {
  email: string;
  senha: string;
}

export interface LoginResponseDTO {
  token: string;
  userId: string;
  nome: string;
  email: string;
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDTO): Promise<LoginResponseDTO> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !user.ativo) throw new UnauthorizedError('Invalid credentials');

    const valid = await this.hashService.compare(dto.senha, user.senhaHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const token = this.jwtService.sign({ userId: user.id, email: user.email });
    return { token, userId: user.id, nome: user.nome, email: user.email };
  }
}
