# ADR-014: Mercado Pago (Checkout Pro) com pagamento após a aprovação do orçamento

**Status**: Aceita
**Data**: 2026-11-11

## Contexto

O enunciado manda integrar pagamentos ao Mercado Pago. É preciso decidir o
produto de checkout, o ponto do fluxo em que o cliente paga e como o resultado
volta ao sistema.

## Decisão

- **Checkout Pro**: o Billing cria uma *preferência*
  (`external_reference = orcamentoId`, `notification_url` pública no API
  Gateway) e devolve o `initPoint` ao cliente; o cartão nunca passa pelo nosso
  backend.
- **Momento**: *orçamento aprovado → pagamento → execução* (a execução só
  começa com o pagamento confirmado). Habilita a compensação mais rica: se o
  reparo falhar, **estornar** no Mercado Pago.
- **Webhook** `POST /api/pagamentos/webhooks/mercadopago` (público): valida a
  assinatura `x-signature` (HMAC-SHA256 com o secret do Mercado Pago) e **nunca
  confia no corpo** — sempre consulta `GET /v1/payments/:id` antes de
  confirmar. Responde 200 rápido e é idempotente.
- **Reconciliação**: `POST /internal/pagamentos/:id/sincronizar` consulta o MP
  e corrige o estado se o webhook não chegar; o timeout de pagamento da Saga é a rede de segurança.
- Escrita no MP com `X-Idempotency-Key`. Credenciais de teste (sandbox) no SSM.
- Port `IPaymentGateway`: adapter real para o MP, *fake* em testes unitários e BDD.

## Consequências

- (+) Sem escopo PCI; fluxo assíncrono encaixa na Saga; compensação com estorno real.
- (−) Depende de URL pública para o webhook (API Gateway) e do sandbox do MP,
  que pode ser instável ⇒ reconciliação e timeout.
- (−) O cliente fica em `AGUARDANDO_PAGAMENTO` até pagar (novo status da OS).
