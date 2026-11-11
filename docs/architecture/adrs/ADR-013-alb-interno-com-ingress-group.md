# ADR-013: ALB interno único com IngressGroup, no lugar de um NLB por serviço

**Status**: Aceita
**Data**: 2026-11-11

## Contexto

Na Fase 3, o `Service` do OS é do tipo `LoadBalancer` (NLB interno) e é o alvo
do VPC Link do API Gateway. Com 3 serviços, manter um NLB por serviço
significaria 3 VPC Links/integrações e 3 balanceadores pagos por hora, e o
API Gateway precisaria conhecer a topologia interna.

## Decisão

Um **único ALB interno**, criado pelo AWS Load Balancer Controller (já
instalado na Fase 3) a partir de recursos `Ingress` que compartilham
`alb.ingress.kubernetes.io/group.name: oficina-<env>`. Cada repositório de
serviço declara no próprio `k8s/ingress.yaml` apenas os **paths** que lhe
pertencem; os `Service` passam a `ClusterIP`.

| Serviço | Paths |
|---|---|
| OS | `/api/ordens-servico`, `/api/clientes`, `/api/veiculos`, `/api/pecas`, `/api/servicos`, `/api/relatorios`, `/api/auth`, `/health`, `/internal` |
| Billing | `/api/orcamentos`, `/api/pagamentos` |
| Execution | `/api/execucoes` |

O VPC Link do API Gateway aponta para o listener do ALB; o authorizer
continua na borda e cada serviço revalida o JWT (defesa em profundidade).
Rotas `/internal/*` **não** são expostas pelo API Gateway (só alcançáveis de
dentro da VPC — usadas pela Lambda e entre serviços).

## Consequências

- (+) 1 balanceador, 1 integração no API Gateway; cada serviço dono do seu roteamento.
- (−) Custo base do ALB (~US$ 16/mês) e dependência do LB Controller;
  o ALB é criado fora do Terraform ⇒ **apagar os Ingress antes de destruir o
  cluster** para não deixar ALB/ENIs órfãos.
- (−) `/internal` no mesmo ALB depende de o API Gateway não rotear esse prefixo
  (garantido pelas rotas explícitas) — validar no smoke test.
