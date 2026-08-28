# ADR-003: Split em quatro repositórios e ordem de aplicação do Terraform

**Status**: Aceita
**Data**: 2026-08-28

## Contexto

O enunciado exige quatro repositórios separados, cada um com CI/CD e deploy automático.
É preciso decidir a fronteira de responsabilidade entre eles e, principalmente, onde
fica a VPC — recurso do qual praticamente todos os outros dependem (RDS, EKS, Lambda em
VPC).

## Decisão

| Repositório | Conteúdo | Depende de |
|---|---|---|
| `soat15-tech-challenge-db-infra` | Terraform: VPC, subnets, RDS PostgreSQL, SSM Parameter Store, security groups | — |
| `soat15-tech-challenge-k8s-infra` | Terraform: EKS, node group, ECR, addons, aplicação dos manifestos | `db-infra` (VPC/security groups via `terraform_remote_state`) |
| `soat15-tech-challenge-auth-lambda` | Lambda de autenticação por CPF + Lambda Authorizer + API Gateway (Terraform) | `db-infra` (endpoint/segredo do RDS), `k8s-infra` (VPC Link para o NLB) |
| `soat15-tech-challenge-01` (este) | Aplicação principal, manifestos `k8s/`, documentação arquitetural | todos os anteriores (imagem publicada, variáveis de ambiente) |

**A VPC fica no repositório de banco** (`db-infra`), por ser o primeiro a precisar de
subnets privadas, e é exportada via `terraform_remote_state` para os demais. Ordem de
`apply`: `db-infra` → `k8s-infra` → `auth-lambda` → deploy da aplicação.

Alternativa descartada: um quinto repositório só de rede — rejeitada por contrariar
literalmente o requisito de quatro repositórios do enunciado.

## Consequências

- Estado do Terraform fica em backend S3 + trava DynamoDB, um `key` por repositório,
  com outputs explícitos consumidos via `terraform_remote_state` — qualquer mudança de
  nome/formato de output em `db-infra` quebra o `plan` dos repositórios dependentes até
  ser propagada.
- A ordem de `apply` precisa ser seguida manualmente (ou por pipeline orquestradora) a
  cada ciclo `destroy`/`apply` de sessão do Learner Lab — documentado no README de cada
  repositório de infraestrutura.
- Credenciais de CI (temporárias do Learner Lab) precisam ser publicadas nos quatro
  repositórios a cada sessão via `scripts/refresh-aws-secrets.sh`, já que não há OIDC
  (ver `ADR-006`/`RFC-001`).

## Referências

- `PHASE_3_PLAN.md`, seção "Mapa dos 4 repositórios" e Etapa 0
