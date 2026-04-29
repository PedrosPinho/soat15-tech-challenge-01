import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { Servico } from '@domain/entities/servico.entity';
import { NumeroOS } from '@domain/value-objects/numero-os.vo';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
import { ICatalogoServicoRepository } from '@domain/repositories/catalogo-servico.repository';
import { IPecaRepository } from '@domain/repositories/peca.repository';
import { NotFoundError, ValidationError } from '@shared/errors/domain.error';
import {
  CreateOrdemServicoDto,
  OrdemServicoResponseDto,
} from '@application/dtos/ordem-servico/ordem-servico.dto';
import { OrdemServicoMapper } from '@application/mappers/ordem-servico.mapper';

export class CreateOrdemServicoUseCase {
  constructor(
    private readonly osRepo: IOrdemServicoRepository,
    private readonly clienteRepo: IClienteRepository,
    private readonly veiculoRepo: IVeiculoRepository,
    private readonly catalogoRepo: ICatalogoServicoRepository,
    private readonly pecaRepo: IPecaRepository,
  ) {}

  async execute(dto: CreateOrdemServicoDto): Promise<OrdemServicoResponseDto> {
    const cliente = await this.clienteRepo.findByCpfCnpj(dto.cpfCnpj);
    if (!cliente) throw new NotFoundError(`Cliente com CPF/CNPJ ${dto.cpfCnpj} não encontrado`);

    const veiculo = await this.veiculoRepo.findByPlaca(dto.placa);
    if (!veiculo) throw new NotFoundError(`Veículo com placa ${dto.placa} não encontrado`);

    if (veiculo.clienteId !== cliente.id) {
      throw new ValidationError('Veículo não pertence ao cliente informado');
    }

    const servicos: Servico[] = [];
    for (const item of dto.catalogoServicos ?? []) {
      const catalogo = await this.catalogoRepo.findById(item.catalogoServicoId);
      if (!catalogo) {
        throw new NotFoundError(`Serviço do catálogo ${item.catalogoServicoId} não encontrado`);
      }

      const pecasUtilizadas: { pecaId: string; quantidade: number; precoUnitario: number }[] = [];
      for (const p of item.pecasUtilizadas ?? []) {
        const peca = await this.pecaRepo.findById(p.pecaId);
        if (!peca) throw new NotFoundError(`Peça ${p.pecaId} não encontrada`);
        pecasUtilizadas.push({ pecaId: peca.id, quantidade: p.quantidade, precoUnitario: peca.precoVenda });
      }

      servicos.push(
        Servico.create({
          descricao: catalogo.descricao,
          tempoEstimadoMinutos: Math.round(catalogo.tempoEstimado * 60),
          valorMaoDeObra: catalogo.preco,
          pecasUtilizadas,
        }),
      );
    }

    const now = new Date();
    const dateKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const sequence = await this.osRepo.nextSequence(dateKey);
    const numeroOS = NumeroOS.generate(now, sequence).toString();

    const os = OrdemServico.create({
      numeroOS,
      clienteId: cliente.id,
      veiculoId: veiculo.id,
      quilometragemEntrada: dto.quilometragemEntrada,
      observacoes: dto.observacoes,
      servicos,
    });

    await this.osRepo.save(os);
    return OrdemServicoMapper.toDto(os);
  }
}
