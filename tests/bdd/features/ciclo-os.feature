# language: pt
Funcionalidade: Ciclo da OS orquestrado por Saga
  Para que a oficina nunca fique com estoque preso, cobrança indevida ou execução órfã
  Como orquestrador da Saga do OS Service
  Eu coordeno Execution e Billing e desfaço o que já foi feito quando um passo falha

  Contexto:
    Dado que existe estoque de 5 unidades da peça "peca-1"
    E que o serviço "cat-1" custa 250 e a peça custa 180

  Cenário: Caminho feliz da abertura à finalização
    Dado que uma OS foi aberta
    Quando o mecânico conclui o diagnóstico com 2 unidades da peça
    E o cliente aprova o orçamento
    E o pagamento é confirmado
    E o mecânico conclui o reparo
    Então a OS está "FINALIZADA"
    E a saga está "CONCLUIDA"
    E o estoque tem 3 disponíveis e 0 reservadas
    E os comandos foram emitidos na ordem "SolicitarDiagnostico, GerarOrcamento, SolicitarPagamento, IniciarReparo"

  Cenário: Orçamento recusado desfaz reserva e execução
    Dado que uma OS foi aberta
    Quando o mecânico conclui o diagnóstico com 2 unidades da peça
    E o cliente recusa o orçamento
    Então a OS está "CANCELADA"
    E a saga está "COMPENSADA"
    E o estoque tem 5 disponíveis e 0 reservadas
    E foram emitidos os comandos de compensação "CancelarExecucao"
    E nenhum estorno foi pedido

  Cenário: Pagamento recusado cancela orçamento, reserva e execução
    Dado que uma OS foi aberta
    Quando o mecânico conclui o diagnóstico com 2 unidades da peça
    E o cliente aprova o orçamento
    E o pagamento é recusado
    Então a OS está "CANCELADA"
    E a saga está "COMPENSADA"
    E o estoque tem 5 disponíveis e 0 reservadas
    E foram emitidos os comandos de compensação "CancelarOrcamento, CancelarExecucao"
    E nenhum estorno foi pedido

  Cenário: Falha no reparo estorna o pagamento e desfaz tudo
    Dado que uma OS foi aberta
    Quando o mecânico conclui o diagnóstico com 2 unidades da peça
    E o cliente aprova o orçamento
    E o pagamento é confirmado
    E o reparo falha
    Então a OS está "CANCELADA"
    E a saga está "COMPENSADA"
    E o estoque tem 5 disponíveis e 0 reservadas
    E foram emitidos os comandos de compensação "EstornarPagamento, CancelarOrcamento, CancelarExecucao"

  Cenário: Cliente não aprova a tempo
    Dado que uma OS foi aberta
    Quando o mecânico conclui o diagnóstico com 2 unidades da peça
    E passa o prazo de aprovação
    Então a OS está "CANCELADA"
    E a saga está "COMPENSADA"
    E o estoque tem 5 disponíveis e 0 reservadas
    E foram emitidos os comandos de compensação "CancelarOrcamento, CancelarExecucao"

  Cenário: Mensagem duplicada não avança a saga duas vezes
    Dado que uma OS foi aberta
    Quando o diagnóstico concluído é entregue 2 vezes com o mesmo messageId
    Então o orçamento foi solicitado 1 vez
    E o estoque tem 3 disponíveis e 2 reservadas
