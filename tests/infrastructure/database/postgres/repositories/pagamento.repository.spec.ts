import { Pool } from 'pg';
import { PostgresPagamentoRepository } from '@infrastructure/database/postgres/repositories/pagamento.repository.impl';
import { PostgresOrdemServicoRepository } from '@infrastructure/database/postgres/repositories/ordem-servico.repository.impl';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { PostgresVeiculoRepository } from '@infrastructure/database/postgres/repositories/veiculo.repository.impl';
import { Cliente } from '@domain/entities/cliente.entity';
import { Veiculo } from '@domain/entities/veiculo.entity';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { Pagamento } from '@domain/entities/pagamento.entity';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../../../../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

let pool: Pool;
let repo: PostgresPagamentoRepository;
let osRepo: PostgresOrdemServicoRepository;
let clienteRepo: PostgresClienteRepository;
let veiculoRepo: PostgresVeiculoRepository;
let ordemServicoId: string;

beforeAll(async () => {
  pool = await startTestDatabase();
  repo = new PostgresPagamentoRepository(pool);
  osRepo = new PostgresOrdemServicoRepository(pool);
  clienteRepo = new PostgresClienteRepository(pool);
  veiculoRepo = new PostgresVeiculoRepository(pool);
});

beforeEach(async () => {
  const cliente = Cliente.create({
    nome: 'Maria Souza',
    cpfCnpj: '11144477735',
    tipo: 'PESSOA_FISICA',
    telefone: '11988888888',
    email: 'maria@test.com',
    endereco: {
      logradouro: 'Rua B',
      numero: '2',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '02000000',
    },
  });
  await clienteRepo.save(cliente);

  const veiculo = Veiculo.create({
    clienteId: cliente.id,
    placa: 'XYZ9876',
    marca: 'VW',
    modelo: 'Gol',
    ano: 2019,
  });
  await veiculoRepo.save(veiculo);

  const os = OrdemServico.create({
    numeroOS: 'OS-20260101-0001',
    clienteId: cliente.id,
    veiculoId: veiculo.id,
    quilometragemEntrada: 500,
    status: 'EM_EXECUCAO',
  });
  await osRepo.save(os);
  ordemServicoId = os.id;
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

function makePagamento(
  overrides: Partial<{ status: Pagamento['status']; valor: number }> = {},
): Pagamento {
  return Pagamento.create({
    ordemServicoId,
    valor: overrides.valor ?? 100,
    formaPagamento: 'PIX',
    status: overrides.status,
  });
}

describe('PostgresPagamentoRepository (integration com PostgreSQL real via Testcontainers)', () => {
  it('save + findById — persiste e recupera', async () => {
    const pagamento = makePagamento();
    await repo.save(pagamento);

    const found = await repo.findById(pagamento.id);
    expect(found?.valor).toBe(100);
    expect(found?.formaPagamento).toBe('PIX');
    expect(found?.status).toBe('PENDENTE');
  });

  it('findById — retorna null quando não encontrado', async () => {
    expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('findByOrdemServicoId — lista todos os pagamentos da OS', async () => {
    await repo.save(makePagamento());
    await repo.save(makePagamento({ valor: 50 }));

    const found = await repo.findByOrdemServicoId(ordemServicoId);
    expect(found).toHaveLength(2);
  });

  it('update — aplica a transição de status (mesmo padrão read-then-write dos demais agregados)', async () => {
    const pagamento = makePagamento();
    await repo.save(pagamento);

    const confirmado = pagamento.confirmar();
    await repo.update(confirmado);

    const found = await repo.findById(pagamento.id);
    expect(found?.status).toBe('CONFIRMADO');
    expect(found?.dataPagamento).not.toBeNull();
  });

  it('índice único parcial impede um segundo pagamento CONFIRMADO para a mesma OS', async () => {
    const primeiro = makePagamento();
    await repo.save(primeiro);
    await repo.update(primeiro.confirmar());

    const segundo = makePagamento({ valor: 30 });
    await repo.save(segundo);

    await expect(repo.update(segundo.confirmar())).rejects.toThrow(
      'Já existe um pagamento confirmado',
    );
  });

  it('list — filtra por ordemServicoId e status, ordenando por criado_em desc', async () => {
    const pendente = makePagamento();
    await repo.save(pendente);
    const confirmado = makePagamento({ valor: 30 });
    await repo.save(confirmado);
    await repo.update(confirmado.confirmar());

    const resultado = await repo.list(1, 10, { ordemServicoId, status: 'CONFIRMADO' });
    expect(resultado.total).toBe(1);
    expect(resultado.pagamentos[0].id).toBe(confirmado.id);
  });

  it('sumConfirmados — soma só os pagamentos CONFIRMADO', async () => {
    const confirmado = makePagamento({ valor: 40 });
    await repo.save(confirmado);
    await repo.update(confirmado.confirmar());
    await repo.save(makePagamento({ valor: 999 })); // permanece PENDENTE

    expect(await repo.sumConfirmados()).toBe(40);
  });

  it('sumConfirmados — retorna 0 quando não há pagamentos confirmados', async () => {
    expect(await repo.sumConfirmados()).toBe(0);
  });
});
