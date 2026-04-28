import { OrdemServico } from '@domain/entities/ordem-servico.entity';
import { Servico } from '@domain/entities/servico.entity';
import { OrdemServicoResponseDto, ServicoResponseDto } from '@application/dtos/ordem-servico/ordem-servico.dto';

export class OrdemServicoMapper {
  static toDto(os: OrdemServico): OrdemServicoResponseDto {
    return {
      id: os.id,
      numeroOS: os.numeroOS,
      clienteId: os.clienteId,
      veiculoId: os.veiculoId,
      quilometragemEntrada: os.quilometragemEntrada,
      status: os.status,
      dataAbertura: os.dataAbertura.toISOString(),
      dataInicio: os.dataInicio?.toISOString(),
      dataConclusao: os.dataConclusao?.toISOString(),
      observacoes: os.observacoes,
      motivoCancelamento: os.motivoCancelamento,
      temPagamento: os.temPagamento,
      servicos: os.servicos.map(OrdemServicoMapper.servicoToDto),
      catalogoServicoId: os.catalogoServicoId,
      precoServico: os.precoServico,
      valorTotal: os.valorTotal,
    };
  }

  static servicoToDto(servico: Servico): ServicoResponseDto {
    return {
      id: servico.id,
      descricao: servico.descricao,
      status: servico.status,
      tempoEstimadoMinutos: servico.tempoEstimadoMinutos,
      tempoRealMinutos: servico.tempoRealMinutos,
      valorMaoDeObra: servico.valorMaoDeObra,
      valorTotalPecas: servico.valorTotalPecas,
      valorTotal: servico.valorTotal,
      pecasUtilizadas: [...servico.pecasUtilizadas],
      observacoes: servico.observacoes,
    };
  }
}
