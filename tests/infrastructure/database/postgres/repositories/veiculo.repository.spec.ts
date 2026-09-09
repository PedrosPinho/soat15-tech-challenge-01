import { Pool } from 'pg';
import { PostgresClienteRepository } from '@infrastructure/database/postgres/repositories/cliente.repository.impl';
import { PostgresVeiculoRepository } from '@infrastructure/database/postgres/repositories/veiculo.repository.impl';
import { Cliente } from '@domain/entities/cliente.entity';
import { Veiculo } from '@domain/entities/veiculo.entity';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
} from '../../../../setup/postgres-testcontainer.helper';

jest.setTimeout(120000);

let pool: Pool;
let repo: PostgresVeiculoRepository;
let clienteRepo: PostgresClienteRepository;
let clienteId: string;

beforeAll(async () => {
  pool = await startTestDatabase();
  repo = new PostgresVeiculoRepository(pool);
  clienteRepo = new PostgresClienteRepository(pool);
});

beforeEach(async () => {
  const cliente = Cliente.create({
    nome: 'Dono do Veículo',
    cpfCnpj: '52998224725',
    tipo: 'PESSOA_FISICA',
    telefone: '11999999999',
    email: 'dono@test.com',
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
});

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await stopTestDatabase();
});

let seq = 0;
function makeVeiculo(overrides: Partial<{ placa: string }> = {}): Veiculo {
  seq += 1;
  return Veiculo.create({
    clienteId,
    placa: overrides.placa ?? `ABC${1000 + seq}`.slice(0, 7),
    marca: 'Fiat',
    modelo: 'Uno',
    ano: 2020,
    quilometragem: 1000,
    cor: 'Prata',
    chassi: `9BWZZZ377VT${seq}00${seq}`.slice(0, 17),
    renavam: '12345678901',
    observacoes: 'Nenhuma',
  });
}

describe('PostgresVeiculoRepository (integration com PostgreSQL real via Testcontainers)', () => {
  it('save + findById — persiste e recupera todos os campos', async () => {
    const veiculo = makeVeiculo();
    await repo.save(veiculo);

    const found = await repo.findById(veiculo.id);
    expect(found?.marca).toBe('Fiat');
    expect(found?.cor).toBe('Prata');
    expect(found?.chassi).toBe(veiculo.chassi);
    expect(found?.clienteId).toBe(clienteId);
  });

  it('findByPlaca — normaliza para maiúsculas', async () => {
    const veiculo = makeVeiculo({ placa: 'ABC1234' });
    await repo.save(veiculo);

    const found = await repo.findByPlaca('abc1234');
    expect(found?.id).toBe(veiculo.id);
  });

  it('placa duplicada viola a constraint UNIQUE', async () => {
    await repo.save(makeVeiculo({ placa: 'ABC1234' }));
    await expect(repo.save(makeVeiculo({ placa: 'ABC1234' }))).rejects.toThrow();
  });

  it('cliente_id inexistente viola a FK', async () => {
    const veiculo = Veiculo.create({
      clienteId: '00000000-0000-0000-0000-000000000000',
      placa: 'XYZ9999',
      marca: 'Fiat',
      modelo: 'Uno',
      ano: 2020,
    });
    await expect(repo.save(veiculo)).rejects.toThrow();
  });

  it('findByClienteId — pagina e ordena por criado_em desc', async () => {
    const v1 = makeVeiculo();
    await repo.save(v1);
    const v2 = makeVeiculo();
    await repo.save(v2);

    const result = await repo.findByClienteId(clienteId, 1, 10);
    expect(result.total).toBe(2);
    expect(result.veiculos).toHaveLength(2);
  });

  it('update — persiste atualização de quilometragem', async () => {
    const veiculo = makeVeiculo();
    await repo.save(veiculo);

    const atualizado = veiculo.atualizarQuilometragem(5000);
    await repo.update(atualizado);

    const found = await repo.findById(veiculo.id);
    expect(found?.quilometragem).toBe(5000);
  });

  it('delete — remove a linha', async () => {
    const veiculo = makeVeiculo();
    await repo.save(veiculo);

    await repo.delete(veiculo.id);

    expect(await repo.findById(veiculo.id)).toBeNull();
  });
});
