# ADR-001: REST síncrono via API Gateway como padrão de comunicação

**Status**: Aceita
**Data**: 2026-08-28

## Contexto

A aplicação principal (Express) já expõe uma API REST síncrona desde a Fase 1. A Fase 3
adiciona um API Gateway na frente dela e duas Lambdas (autenticação). É preciso decidir
se a comunicação entre cliente → borda → aplicação continua síncrona (request/response
HTTP) ou se algum trecho passa a ser assíncrono (fila/evento), por exemplo para a
notificação por e-mail.

## Decisão

Manter **REST síncrono** em toda a cadeia cliente → API Gateway → (Lambda ou VPC
Link/EKS). Nenhuma fila ou barramento de eventos é introduzido nesta fase. A única
assincronia do sistema é a notificação por e-mail, que já era fire-and-forget desde a
Fase 2 (`notificarMudancaStatusOS`) — resolvida em processo, sem fila externa.

## Consequências

- Simplicidade: um único padrão de comunicação para toda a API, sem infraestrutura de
  mensageria (SQS/SNS/EventBridge) a operar, provisionar ou pagar.
- Cold start da Lambda de autenticação afeta diretamente a latência percebida pelo
  cliente — mitigado por aquecimento antes de demonstrações e, se necessário,
  `provisioned_concurrency`.
- Alternativa que **não** foi escolhida, registrada para referência futura: publicar
  evento em SNS/EventBridge consumido por uma Lambda de notificação, desacoplando o
  envio de e-mail da requisição HTTP síncrona (citada como alternativa em
  `PHASE_3_PLAN.md`, mas descartada por adicionar um quinto componente a operar sem
  necessidade clara no volume deste projeto).

## Referências

- `component-diagram.md`
- `PHASE_3_PLAN.md`, seção "Padrões assumidos"
