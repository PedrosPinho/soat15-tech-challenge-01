# ADR-007: `main` (produção) não recebeu deploy real nesta entrega

**Status**: Aceita
**Data**: 2026-09-09

## Contexto

O PDF do desafio pede "deploy automático das branches de homologação e produção".
Os quatro pipelines já implementam essa lógica: cada um decide o ambiente
(`homolog` vs. `prod`) a partir de `github.ref_name`, com namespace/workspace
próprio por ambiente (ver `ADR-003`). Tecnicamente, um push em `main` dispara o
mesmo pipeline que já roda em `homolog`, só que mirando o ambiente de produção.

Na prática, isso nunca foi exercido de ponta a ponta nesta entrega:

- `soat15-tech-challenge-db-infra` e `soat15-tech-challenge-auth-lambda`
  **nem têm a branch `main` criada** — só `homolog` existe nesses dois repos.
- `soat15-tech-challenge-01` e `soat15-tech-challenge-k8s-infra` têm `main`,
  mas o app nunca recebeu um push nela (nenhuma execução de CI/CD contra
  `main` no histórico), e o único push que o `k8s-infra` recebeu em `main`
  foi incidental, não um deploy de produção deliberado.

O motivo é orçamento: o `PHASE_3_PLAN.md` já registra a decisão de **homolog e
produção compartilharem o mesmo cluster EKS e o mesmo RDS**, separados por
namespace/banco lógico (Etapa 7, "Homolog e produção no mesmo lab") — não há
crédito no AWS Academy Learner Lab para dois ambientes totalmente
independentes. Ainda assim, mesmo dentro dessa concessão, seria possível
promover `homolog` → `main` e ter o namespace `oficina-prod` populado ao lado
de `oficina-homolog` no mesmo cluster; isso não chegou a ser feito.

## Decisão

Entregar a Fase 3 com **produção implementada em código e pipeline, mas não
exercida de fato** — `homolog` é o único ambiente com dados reais, validado
ponta a ponta (autenticação, OS, observabilidade). Não criar as branches
`main` que faltam nem forçar um primeiro deploy de produção só para preencher
esse item, dado o cluster/RDS compartilhado: um deploy de "produção" aqui
seria outro namespace no mesmo hardware que já roda `homolog`, sem o ganho de
isolamento que a palavra normalmente implica, ao custo de rodar o Terraform
uma vez a mais no lab.

## Consequências

**Aceito conscientemente**: o item "deploy automático de produção" do PDF é
satisfeito na capacidade do pipeline (a lógica existe e é idêntica à de
homolog), não na evidência de uma execução real em `main`. Quem revisar via
`gh api .../branches` vai ver que `main` nem existe em dois dos quatro repos.

**O que se faria numa conta real** (registrado para referência, não
implementado aqui): dois clusters EKS e duas instâncias RDS reais (ou ao menos
duas instâncias RDS com o mesmo cluster, dado HPA/namespace já isolarem a
carga), com `main` protegida recebendo deploy só após aprovação de PR vinda de
`homolog` — o desenho que `ADR-003`/`PHASE_3_PLAN.md` já descrevem como
alternativa "se houver crédito".

## Referências

- `PHASE_3_PLAN.md`, Etapa 7, "[DECISÃO] Homolog e produção no mesmo lab"
- `PROJECT_STATUS.md`, tabela de pendências da Fase 3
- `ADR-003-split-quatro-repositorios.md`
