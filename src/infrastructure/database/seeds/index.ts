/**
 * Popula dados mínimos para testar a aplicação manualmente (ver
 * docs/PHASE_3_EXECUTION_GUIDE.md, Passo 4.3): um usuário interno para
 * `POST /api/auth/login` e um cliente com CPF de fixture para
 * `POST /auth/token` na Lambda de autenticação. Idempotente — pode rodar
 * de novo sem duplicar (verifica existência por e-mail/CPF antes de inserir).
 */
import { connectDatabase, disconnectDatabase } from '../postgres/pool';
import { PostgresUserRepository } from '../postgres/repositories/user.repository.impl';
import { PostgresClienteRepository } from '../postgres/repositories/cliente.repository.impl';
import { User } from '@domain/entities/user.entity';
import { Cliente } from '@domain/entities/cliente.entity';
import { HashService } from '@infrastructure/security/hash.service';
import { logger } from '@shared/logger';

const ADMIN_EMAIL = 'admin@oficina.com';
const ADMIN_SENHA = 'senha123';
const CLIENTE_CPF = '52998224725';

const seed = async (): Promise<void> => {
  const pool = await connectDatabase();
  const userRepo = new PostgresUserRepository(pool);
  const clienteRepo = new PostgresClienteRepository(pool);

  const usuarioExistente = await userRepo.findByEmail(ADMIN_EMAIL);
  if (!usuarioExistente) {
    const hashService = HashService.fromEnv();
    const admin = User.create({
      nome: 'Administrador',
      email: ADMIN_EMAIL,
      senhaHash: await hashService.hash(ADMIN_SENHA),
    });
    await userRepo.save(admin);
    logger.info({ email: ADMIN_EMAIL }, 'Usuário admin semeado');
  } else {
    logger.info({ email: ADMIN_EMAIL }, 'Usuário admin já existe, pulando');
  }

  const clienteExistente = await clienteRepo.findByCpfCnpj(CLIENTE_CPF);
  if (!clienteExistente) {
    const cliente = Cliente.create({
      nome: 'Cliente Teste',
      cpfCnpj: CLIENTE_CPF,
      tipo: 'PESSOA_FISICA',
      telefone: '11999999999',
      email: 'cliente.teste@example.com',
      endereco: {
        logradouro: 'Rua de Teste',
        numero: '100',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01001000',
      },
    });
    await clienteRepo.save(cliente);
    logger.info({ cpf: CLIENTE_CPF }, 'Cliente de teste semeado');
  } else {
    logger.info({ cpf: CLIENTE_CPF }, 'Cliente de teste já existe, pulando');
  }
};

seed()
  .then(() => disconnectDatabase())
  .then(() => {
    logger.info('Seed concluído');
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ error }, 'Falha ao rodar seed');
    process.exit(1);
  });
