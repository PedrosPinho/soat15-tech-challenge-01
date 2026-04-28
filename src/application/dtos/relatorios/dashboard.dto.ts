export interface DashboardResponseDto {
  ordensServico: {
    total: number;
    abertas: number;
    emAndamento: number;
    concluidas: number;
    canceladas: number;
  };
  financeiro: {
    receitaTotal: number;
  };
  estoque: {
    itensAbaixoDoMinimo: number;
  };
}
