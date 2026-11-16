import { Router } from 'express';
import { internalTokenMiddleware } from '@presentation/middlewares/internal-token.middleware';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { CpfCnpj } from '@domain/value-objects/cpf-cnpj.vo';
import { NotFoundError } from '@shared/errors/domain.error';

/**
 * Rotas internas (fora do prefixo `/api`, fora do API Gateway), protegidas por
 * `x-internal-token`. `GET /internal/clientes/by-cpf/:cpf` substitui o acesso
 * direto da Lambda ao banco do OS (ADR-015): nenhum serviço lê o banco de outro.
 */
export const createInternalRouter = (
  clienteRepo: () => IClienteRepository = () => new PostgresClienteRepository(),
): Router => {
  const router = Router();
  router.use(internalTokenMiddleware);

  router.get('/clientes/by-cpf/:cpf', async (req, res, next) => {
    try {
      const cpf = CpfCnpj.create(String(req.params['cpf']));
      const cliente = await clienteRepo().findByCpfCnpj(cpf.value);
      if (!cliente) throw new NotFoundError('Cliente não encontrado');
      res.json({
        id: cliente.id,
        nome: cliente.nome,
        cpfCnpj: cliente.cpfCnpj.value,
        ativo: cliente.ativo,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
};

export const internalRouter = createInternalRouter();
