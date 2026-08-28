import { Pool } from 'pg';
import { PostgresOrdemServicoRepository } from '@infrastructure/database/postgres/repositories/ordem-servico.repository.impl';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { PostgresVeiculoRepository } from '@infrastructure/database/postgres/repositories/veiculo.repository.impl';
import { PostgresPecaRepository } from '@infrastructure/database/postgres/repositories/peca.repository.impl';
import { Cliente } from '@domain/entities/cliente.entity';
import { Veiculo } from '@domain/entities/veiculo.entity';
import { Peca } from '@domain/entities/peca.entity';
import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { Servico } from '@domain/entities/servico.entity';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../../../../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

let pool: Pool;
let repo: PostgresOrdemServicoRepository;
let clienteRepo: PostgresClienteRepository;
let veiculoRepo: PostgresVeiculoRepository;
let pecaRepo: PostgresPecaRepository;
let clienteId: string;
let veiculoId: string;
let pecaId: string;

beforeAll(async () => {
  pool = await startTestDatabase();
  repo = new PostgresOrdemServicoRepository(pool);
  clienteRepo = new PostgresClienteRepository(pool);
  veiculoRepo = new PostgresVeiculoRepository(pool);
  pecaRepo = new PostgresPecaRepository(pool);
});

beforeEach(async () => {
  const cliente = Cliente.create({
    nome: 'João Silva',
    cpfCnpj: '52998224725',
    tipo: 'PESSOA_FISICA',
    telefone: '11999999999',
    email: 'joao@test.com',
    endereco: {
      logradouro: 'Rua A',
      numero: '1',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01000000',
    },
  });
  await clienteRepo.save(cliente);
  clienteId = cliente.id;

  const veiculo = Veiculo.create({ clienteId, placa: 'ABC1234', marca: 'Fiat', modelo: 'Uno', ano: 2020 });
  await veiculoRepo.save(veiculo);
  veiculoId = veiculo.id;

  const peca = Peca.create({
    codigo: 'PC-OS',
    descricao: 'Peça para teste de OS',
    categoria: 'MOTOR',
    precoCompra: 10,
    precoVenda: 25,
    unidadeMedida: 'UNIDADE',
    nivelMinimo: 1,
    nivelMaximo: 50,
  });
  await pecaRepo.save(peca);
  pecaId = peca.id;
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

let osSeq = 0;
function makeOS(overrides: Partial<{ status: OrdemServico['status']; servicos: Servico[] }> = {}): OrdemServico {
  osSeq += 1;
  return OrdemServico.create({
    numeroOS: `OS-20260101-${String(osSeq).padStart(4, '0')}`,
    clienteId,
    veiculoId,
    quilometragemEntrada: 1000,
    status: overrides.status,
    servicos: overrides.servicos,
  });
}

function makeServico(): Servico {
  return Servico.create({
    descricao: 'Troca de óleo',
    tempoEstimadoMinutos: 30,
    valorMaoDeObra: 50,
    pecasUtilizadas: [{ pecaId, descricao: 'Peça para teste de OS', quantidade: 2, precoUnitario: 25 }],
  });
}

describe('PostgresOrdemServicoRepository (integration com PostgreSQL real via Testcontainers)', () => {
  it('save + findById — persiste e recupera a árvore completa (OS -> Servico -> peça)', async () => {
    const os = makeOS({ servicos: [makeServico()] });
    await repo.save(os);

    const found = await repo.findById(os.id);
    expect(found).not.toBeNull();
    expect(found?.numeroOS).toBe(os.numeroOS);
    expect(found?.servicos).toHaveLength(1);
    expect(found?.servicos[0].descricao).toBe('Troca de óleo');
    expect(found?.servicos[0].pecasUtilizadas).toHaveLength(1);
    expect(found?.servicos[0].pecasUtilizadas[0].pecaId).toBe(pecaId);
    expect(found?.servicos[0].valorTotal).toBe(100); // 50 mão de obra + 2*25 peça
  });

  it('save — persiste OS sem nenhum serviço', async () => {
    const os = makeOS();
    await repo.save(os);

    const found = await repo.findById(os.id);
    expect(found?.servicos).toHaveLength(0);
  });

  it('findById — retorna null quando não encontrado', async () => {
    expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('findByNumeroOS — recupera pelo número da OS', async () => {
    const os = makeOS({ servicos: [makeServico()] });
    await repo.save(os);

    const found = await repo.findByNumeroOS(os.numeroOS);
    expect(found?.id).toBe(os.id);
  });

  it('numero_os duplicado viola a constraint UNIQUE e faz rollback (nenhum serviço órfão fica gravado)', async () => {
    const os1 = makeOS({ servicos: [makeServico()] });
    await repo.save(os1);

    const os2 = OrdemServico.create({
      numeroOS: os1.numeroOS,
      clienteId,
      veiculoId,
      quilometragemEntrada: 500,
      servicos: [makeServico()],
    });
    await expect(repo.save(os2)).rejects.toThrow();

    const { rows } = await pool.query('SELECT COUNT(*) FROM servicos_os WHERE ordem_servico_id = $1', [
      os2.id,
    ]);
    expect(Number(rows[0].count)).toBe(0);
  });

  it('update — substitui a árvore de serviços (DELETE + INSERT transacional)', async () => {
    const os = makeOS({ servicos: [makeServico()] });
    await repo.save(os);

    const iniciada = os.iniciar().adicionarServico(makeServico());
    await repo.update(iniciada);

    const found = await repo.findById(os.id);
    expect(found?.status).toBe('EM_DIAGNOSTICO');
    expect(found?.servicos).toHaveLength(2);
    expect(found?.dataInicio).not.toBeNull();
  });

  it('findByClienteId — pagina e ordena por data de abertura desc', async () => {
    await repo.save(makeOS());
    await repo.save(makeOS());

    const result = await repo.findByClienteId(clienteId, 1, 10);
    expect(result.total).toBe(2);
    expect(result.ordens).toHaveLength(2);
  });

  describe('list', () => {
    it('filtro padrão exclui FINALIZADA e ENTREGUE, ordenando por peso de status', async () => {
      const recebida = makeOS({ status: 'RECEBIDA' });
      const emExecucao = makeOS({ status: 'EM_EXECUCAO' });
      const finalizada = makeOS({ status: 'FINALIZADA' });
      await repo.save(recebida);
      await repo.save(emExecucao);
      await repo.save(finalizada);

      const result = await repo.list(1, 10);

      expect(result.total).toBe(2);
      expect(result.ordens.map((o) => o.id)).toEqual([emExecucao.id, recebida.id]);
    });

    it('filtro por status explícito ignora o default e retorna só o status pedido', async () => {
      await repo.save(makeOS({ status: 'FINALIZADA' }));
      await repo.save(makeOS({ status: 'RECEBIDA' }));

      const result = await repo.list(1, 10, { status: 'FINALIZADA' });

      expect(result.total).toBe(1);
      expect(result.ordens[0].status).toBe('FINALIZADA');
    });

    it('filtro por clienteId/veiculoId', async () => {
      await repo.save(makeOS());
      const result = await repo.list(1, 10, { clienteId, veiculoId });
      expect(result.total).toBe(1);
    });
  });

  describe('nextSequence', () => {
    it('incrementa atomicamente por data_chave, começando em 1', async () => {
      expect(await repo.nextSequence('20260101')).toBe(1);
      expect(await repo.nextSequence('20260101')).toBe(2);
      expect(await repo.nextSequence('20260102')).toBe(1);
    });

    it('não perde incrementos em concorrência: N chamadas concorrentes produzem N sequências distintas', async () => {
      const attempts = Array.from({ length: 20 }, () => repo.nextSequence('20260201'));
      const results = await Promise.all(attempts);

      expect(new Set(results).size).toBe(20);
      expect(Math.max(...results)).toBe(20);
    });
  });
});
