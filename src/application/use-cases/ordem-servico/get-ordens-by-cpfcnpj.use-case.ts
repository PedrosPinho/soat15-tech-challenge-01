import { IOrdemServicoRepository } from '@domain/repositories/ordem-servico.repository';
import { IClienteRepository } from '@domain/repositories/cliente.repository';
import { NotFoundError } from '@shared/errors/domain.error';
import { ListOrdensServicoResponseDto } from '@application/dtos/ordem-servico/ordem-servico.dto';
import { OrdemServicoMapper } from '@application/mappers/ordem-servico.mapper';

export class GetOrdensByCpfCnpjUseCase {
  constructor(
    private readonly osRepo: IOrdemServicoRepository,
    private readonly clienteRepo: IClienteRepository,
  ) {}

  async execute(cpfCnpj: string, page = 1, limit = 20): Promise<ListOrdensServicoResponseDto> {
    const cliente = await this.clienteRepo.findByCpfCnpj(cpfCnpj);
    if (!cliente) throw new NotFoundError(`Cliente com CPF/CNPJ ${cpfCnpj} não encontrado`);

    const { ordens, total } = await this.osRepo.findByClienteId(cliente.id, page, limit);
    return {
      ordens: ordens.map(OrdemServicoMapper.toDto),
      total,
      page,
      limit,
    };
  }
}
