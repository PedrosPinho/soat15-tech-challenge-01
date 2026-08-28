import { PostgresOrdemServicoRepository } from '@infrastructure/database/postgres/repositories/ordem-servico.repository.impl';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { PostgresVeiculoRepository } from '@infrastructure/database/postgres/repositories/veiculo.repository.impl';
import { PostgresCatalogoServicoRepository } from '@infrastructure/database/postgres/repositories/catalogo-servico.repository.impl';
import { PostgresPecaRepository } from '@infrastructure/database/postgres/repositories/peca.repository.impl';
import { makeNotificationService } from '@main/factories/notification.factory';
import { OrdemServicoController } from '@presentation/controllers/ordem-servico.controller';
import { CreateOrdemServicoUseCase } from '@application/use-cases/ordem-servico/create-ordem-servico.use-case';
import { GetOrdemServicoUseCase } from '@application/use-cases/ordem-servico/get-ordem-servico.use-case';
import { ListOrdensServicoUseCase } from '@application/use-cases/ordem-servico/list-ordens-servico.use-case';
import { IniciarOSUseCase } from '@application/use-cases/ordem-servico/iniciar-os.use-case';
import { AguardarAprovacaoOSUseCase } from '@application/use-cases/ordem-servico/aguardar-aprovacao-os.use-case';
import { AprovarOSUseCase } from '@application/use-cases/ordem-servico/aprovar-os.use-case';
import { ConcluirOSUseCase } from '@application/use-cases/ordem-servico/concluir-os.use-case';
import { EntregarOSUseCase } from '@application/use-cases/ordem-servico/entregar-os.use-case';
import { CancelarOSUseCase } from '@application/use-cases/ordem-servico/cancelar-os.use-case';
import { GetOrdensByCpfCnpjUseCase } from '@application/use-cases/ordem-servico/get-ordens-by-cpfcnpj.use-case';
import { ProcessarAprovacaoOrcamentoUseCase } from '@application/use-cases/ordem-servico/processar-aprovacao-orcamento.use-case';

export const makeOrdemServicoController = (): OrdemServicoController => {
  const osRepo = new PostgresOrdemServicoRepository();
  const clienteRepo = new PostgresClienteRepository();
  const veiculoRepo = new PostgresVeiculoRepository();
  const catalogoRepo = new PostgresCatalogoServicoRepository();
  const pecaRepo = new PostgresPecaRepository();
  const notificationService = makeNotificationService();

  return new OrdemServicoController(
    new CreateOrdemServicoUseCase(osRepo, clienteRepo, veiculoRepo, catalogoRepo, pecaRepo),
    new GetOrdemServicoUseCase(osRepo),
    new ListOrdensServicoUseCase(osRepo),
    new IniciarOSUseCase(osRepo, clienteRepo, notificationService),
    new AguardarAprovacaoOSUseCase(osRepo, clienteRepo, notificationService),
    new AprovarOSUseCase(osRepo, clienteRepo, notificationService),
    new ConcluirOSUseCase(osRepo, clienteRepo, notificationService),
    new EntregarOSUseCase(osRepo, clienteRepo, notificationService),
    new CancelarOSUseCase(osRepo, clienteRepo, notificationService),
    new GetOrdensByCpfCnpjUseCase(osRepo, clienteRepo),
    new ProcessarAprovacaoOrcamentoUseCase(osRepo, clienteRepo, notificationService),
  );
};
