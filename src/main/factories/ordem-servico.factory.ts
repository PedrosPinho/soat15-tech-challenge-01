import { PostgresOrdemServicoRepository } from '@infrastructure/database/postgres/repositories/ordem-servico.repository.impl';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { PostgresVeiculoRepository } from '@infrastructure/database/postgres/repositories/veiculo.repository.impl';
import { PostgresCatalogoServicoRepository } from '@infrastructure/database/postgres/repositories/catalogo-servico.repository.impl';
import { PostgresPecaRepository } from '@infrastructure/database/postgres/repositories/peca.repository.impl';
import { makeNotificationService } from '@main/factories/notification.factory';
import { getSagaRuntime } from '@main/factories/saga.factory';
import { GetHistoricoOSUseCase } from '@application/use-cases/ordem-servico/get-historico-os.use-case';
import { OrdemServicoController } from '@presentation/controllers/ordem-servico.controller';
import { CreateOrdemServicoUseCase } from '@application/use-cases/ordem-servico/create-ordem-servico.use-case';
import { GetOrdemServicoUseCase } from '@application/use-cases/ordem-servico/get-ordem-servico.use-case';
import { ListOrdensServicoUseCase } from '@application/use-cases/ordem-servico/list-ordens-servico.use-case';
import { EntregarOSUseCase } from '@application/use-cases/ordem-servico/entregar-os.use-case';
import { CancelarOSUseCase } from '@application/use-cases/ordem-servico/cancelar-os.use-case';
import { GetOrdensByCpfCnpjUseCase } from '@application/use-cases/ordem-servico/get-ordens-by-cpfcnpj.use-case';

export const makeOrdemServicoController = (): OrdemServicoController => {
  const osRepo = new PostgresOrdemServicoRepository();
  const clienteRepo = new PostgresClienteRepository();
  const veiculoRepo = new PostgresVeiculoRepository();
  const catalogoRepo = new PostgresCatalogoServicoRepository();
  const pecaRepo = new PostgresPecaRepository();
  const notificationService = makeNotificationService();
  const { uow, orchestrator, sagas, historico } = getSagaRuntime();

  return new OrdemServicoController(
    new CreateOrdemServicoUseCase(
      osRepo,
      clienteRepo,
      veiculoRepo,
      catalogoRepo,
      pecaRepo,
      uow,
      orchestrator,
    ),
    new GetOrdemServicoUseCase(osRepo),
    new ListOrdensServicoUseCase(osRepo),
    new EntregarOSUseCase(osRepo, clienteRepo, notificationService),
    new CancelarOSUseCase(orchestrator),
    new GetOrdensByCpfCnpjUseCase(osRepo, clienteRepo),
    new GetHistoricoOSUseCase(osRepo, sagas, historico),
  );
};
