export interface DashboardResponseDto {
  ordensServico: {
    total: number;
    recebidas: number;
    emExecucao: number;
    finalizadas: number;
    canceladas: number;
  };
  financeiro: {
    receitaTotal: number;
  };
  estoque: {
    itensAbaixoDoMinimo: number;
  };
}
