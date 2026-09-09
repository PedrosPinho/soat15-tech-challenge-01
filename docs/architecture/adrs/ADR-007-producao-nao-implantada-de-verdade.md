# ADR-007: `main` existe e roda CI/CD, mas produção não é implantada de verdade

**Status**: Aceita
**Data**: 2026-09-09 (revisada em 2026-09-09)

## Contexto

O PDF do desafio pede "deploy automático das branches de homologação e produção".
Os quatro pipelines já implementam essa lógica: cada um decide o ambiente
(`homolog` vs. `prod`) a partir de `github.ref_name`, com namespace/workspace
próprio por ambiente (ver `ADR-003`). Tecnicamente, um push em `main` dispara o
mesmo pipeline que já roda em `homolog`, só que mirando o ambiente de produção.

Até esta revisão, isso nunca tinha sido exercido de ponta a ponta:
`soat15-tech-challenge-db-infra` e `soat15-tech-challenge-auth-lambda` nem
tinham a branch `main` criada (só `homolog` existia), e `soat15-tech-challenge-01`/
`soat15-tech-challenge-k8s-infra` tinham `main`, mas sem nenhum deploy real
contra ela.

O motivo é orçamento: o `PHASE_3_PLAN.md` já registra a decisão de **homolog e
produção compartilharem o mesmo cluster EKS e o mesmo RDS**, separados por
namespace/banco lógico (Etapa 7, "Homolog e produção no mesmo lab") — não há
crédito no AWS Academy Learner Lab para dois ambientes totalmente
independentes.

**Achado ao investigar como fechar esse item**: um `terraform apply` de
verdade em `main` para `db-infra` e `auth-lambda` **não falharia** — teria
**sucesso**, e isso é o problema. Os dois repositórios usam *workspaces* do
Terraform (`terraform workspace select -or-create prod`), e `db-infra`
inclui `terraform.workspace` no nome de todos os recursos
(`local.name_prefix`) justamente para não colidir com `homolog` — ou seja,
um push em `main` criaria uma **VPC + RDS inteiramente novos e pagos** no
workspace `prod`, redundantes aos de `homolog`, não um erro. Em
`auth-lambda`, o `terraform_remote_state` do `db_infra` lê o workspace
`"homolog"` **fixo** (não por branch), então um `apply` de `main` criaria
Lambdas + API Gateway novos apontando para a mesma VPC/RDS de homolog — de
novo, sucesso indesejado, não falha. Só o `soat15-tech-challenge-01` falharia
de fato (o passo que descreve `soat15-tc-prod-db` via AWS CLI encontraria um
RDS inexistente), e `k8s-infra` é inofensivo de qualquer forma (não usa
workspace — reaplica o mesmo cluster compartilhado, idempotente).

## Decisão

Ter as quatro branches `main` existindo, protegidas e recebendo PR de
`homolog` como qualquer outra promoção de branch — mas **impedir
deliberadamente que o apply de produção rode de verdade** em vez de confiar
que ele falharia sozinho:

- `db-infra` e `auth-lambda`: o job de apply roda `terraform plan` em vez de
  `terraform apply` quando `github.ref_name == 'main'` — nunca muta estado
  real. O teste de fumaça de `auth-lambda` (invocar a Lambda) também é pulado
  em `main`, já que não há Lambda de verdade implantada para invocar.
- `soat15-tech-challenge-01`: o job `deploy` ganha
  `continue-on-error: ${{ github.ref_name == 'main' }}` — ele genuinamente
  falha no passo que busca o RDS de prod (que não existe), e isso agora
  aparece como falha permitida/esperada na Actions UI, não como pipeline
  quebrado.
- `k8s-infra`: sem mudança — já é seguro (reaplica o cluster compartilhado).

## Consequências

**Aceito conscientemente**: o item "deploy automático de produção" do PDF
fica satisfeito na letra (as quatro branches `main` existem, protegidas, com
CI/CD disparando de verdade a cada push) sem o risco de gerar uma segunda
infraestrutura paga por engano. Quem revisar via Actions vai ver `main`
rodando plan/allow-fail, não uma implantação de produção funcional — isso é
intencional, não um bug.

**O que se faria numa conta real** (registrado para referência, não
implementado aqui): dois clusters EKS e duas instâncias RDS reais (ou ao
menos duas instâncias RDS com o mesmo cluster, dado HPA/namespace já
isolarem a carga), com `apply`/`terraform apply` de verdade em `main` — o
desenho que `ADR-003`/`PHASE_3_PLAN.md` já descrevem como alternativa "se
houver crédito".

## Referências

- `PHASE_3_PLAN.md`, Etapa 7, "[DECISÃO] Homolog e produção no mesmo lab"
- `PROJECT_STATUS.md`, tabela de pendências da Fase 3
- `ADR-003-split-quatro-repositorios.md`
