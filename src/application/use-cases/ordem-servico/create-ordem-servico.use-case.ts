import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { Servico } from '@domain/entities/servico.entity';
import { NumeroOS } from '@domain/value-objects/numero-os.vo';
import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { IVeiculoRepository } from '@domain/repositories/veiculo.repository';
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
  ) {}

  async execute(dto: CreateOrdemServicoDto): Promise<OrdemServicoResponseDto> {
    const cliente = await this.clienteRepo.findByCpfCnpj(dto.cpfCnpj);
    if (!cliente) throw new NotFoundError(`Cliente com CPF/CNPJ ${dto.cpfCnpj} não encontrado`);

    const veiculo = await this.veiculoRepo.findByPlaca(dto.placa);
    if (!veiculo) throw new NotFoundError(`Veículo com placa ${dto.placa} não encontrado`);

    if (veiculo.clienteId !== cliente.id) {
      throw new ValidationError('Veículo não pertence ao cliente informado');
    }

    const now = new Date();
    const dateKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const sequence = await this.osRepo.nextSequence(dateKey);
    const numeroOS = NumeroOS.generate(now, sequence).toString();

    const servicos = (dto.servicos ?? []).map((s) => Servico.create(s));

    const os = OrdemServico.create({
      numeroOS,
      clienteId: cliente.id,
      veiculoId: veiculo.id,
      quilometragemEntrada: dto.quilometragemEntrada,
      observacoes: dto.observacoes,
      servicos,
      catalogoServicoId: dto.catalogoServicoId,
      precoServico: dto.precoServico,
    });

    await this.osRepo.save(os);
    return OrdemServicoMapper.toDto(os);
  }
}
