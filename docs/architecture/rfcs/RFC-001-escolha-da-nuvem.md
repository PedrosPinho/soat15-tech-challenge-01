# RFC-001: Escolha do provedor de nuvem

**Status**: Aceita
**Data**: 2026-08-28
**Autor(es)**: Equipe do Tech Challenge

## Contexto

O enunciado da Fase 3 exige API Gateway, autenticação serverless por CPF, banco de
dados gerenciado relacional, cluster Kubernetes gerenciado, e observabilidade — todos
como serviços de um provedor de nuvem. O enunciado cita explicitamente o AWS API
Gateway como primeiro exemplo de gateway aceito. A equipe tem acesso a uma conta **AWS
Academy Learner Lab**, não a contas comerciais de outros provedores.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **AWS (AWS Academy Learner Lab)** | Acesso já disponível via curso; API Gateway + Lambda + RDS + EKS cobrem todos os requisitos num único provedor; citado explicitamente no enunciado | Learner Lab tem restrições fortes de IAM, sem OIDC, credenciais expiram a cada ~4h (ver `PHASE_3_PLAN.md`, seção "Restrições do AWS Academy Learner Lab") |
| GCP (GKE + Cloud Functions + Cloud SQL) | Sem as restrições de IAM do Learner Lab | Sem conta educacional disponível para o grupo; custo direto do cartão de crédito |
| Azure (AKS + Functions + Azure Database) | Idem GCP | Idem GCP |
| Multi-cloud | Nenhum ganho para o escopo do curso | Complexidade de rede (VPN/peering entre nuvens) desproporcional ao prazo e ao objetivo de aprendizado |

## Decisão

**AWS, via AWS Academy Learner Lab.** É a única opção com acesso garantido sem custo
direto ao grupo, cobre todos os serviços exigidos no mesmo provedor, e é citada no
enunciado como exemplo válido.

## Consequências

- Toda decisão de infraestrutura subsequente (RFC-002 a RFC-004, ADR-001 a ADR-006)
  precisa ser lida à luz das restrições do Learner Lab, não das práticas padrão de uma
  conta AWS comercial — em vários pontos a decisão "correta" numa conta real (OIDC,
  IRSA, roles dedicadas por serviço) é impossível aqui e precisa de uma alternativa
  documentada como concessão deliberada, não como descuido.
- Região fixa em `us-east-1` (restrição prática do Learner Lab), sem estratégia
  multi-região.
- Orçamento limitado (~US$ 50, sessões de ~4h) obriga um ciclo `destroy`/`apply` por
  sessão de trabalho em vez de infraestrutura permanente — ver riscos e mitigação no
  `PHASE_3_PLAN.md`.

## Referências

- `PHASE_3_PLAN.md`, seções "Padrões assumidos" e "Restrições do AWS Academy Learner Lab"
- `ADR-006` (uso da `LabRole` compartilhada em vez de IRSA)
