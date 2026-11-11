export interface DashboardResponseDto {
  ordensServico: {
    total: number;
    recebidas: number;
    emExecucao: number;
    finalizadas: number;
    canceladas: number;
  };
  financeiro: {
    /** `null` quando o Billing Service está indisponível. */
    receitaTotal: number | null;
  };
  estoque: {
    itensAbaixoDoMinimo: number;
  };
}
