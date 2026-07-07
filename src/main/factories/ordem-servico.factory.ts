import { MongoOrdemServicoRepository } from '@infrastructure/database/mongodb/repositories/ordem-servico.repository.impl';
import { MongoClienteRepository } from '@infrastructure/database/mongodb/repositories/cliente.repository.impl';
import { MongoVeiculoRepository } from '@infrastructure/database/mongodb/repositories/veiculo.repository.impl';
import { MongoCatalogoServicoRepository } from '@infrastructure/database/mongodb/repositories/catalogo-servico.repository.impl';
import { MongoPecaRepository } from '@infrastructure/database/mongodb/repositories/peca.repository.impl';
import { NodemailerNotificationService } from '@infrastructure/notifications/nodemailer-notification.service';
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
  const osRepo = new MongoOrdemServicoRepository();
  const clienteRepo = new MongoClienteRepository();
  const veiculoRepo = new MongoVeiculoRepository();
  const catalogoRepo = new MongoCatalogoServicoRepository();
  const pecaRepo = new MongoPecaRepository();
  const notificationService = new NodemailerNotificationService();

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
