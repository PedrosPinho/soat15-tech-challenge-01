# RFC-004: Estratégia de observabilidade

**Status**: Aceita
**Data**: 2026-08-28
**Autor(es)**: Equipe do Tech Challenge

## Contexto

Até a Fase 2, observabilidade se resume a `GET /health` e `console.log`/`console.error`
de texto livre. O enunciado da Fase 3 exige monitoramento com dashboards e alertas em
nuvem, cobrindo latência, erros, e saúde do cluster. O projeto será avaliado depois de
pronto (não necessariamente durante uma sessão ativa do Learner Lab), o que pesa contra
soluções com prazo de validade curto.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **New Relic** | Free tier **perpétuo** (100 GB/mês, 1 usuário full) cobre APM + infraestrutura K8s + logs + alertas + dashboards, sem prazo de expiração | Menos difundido em tutoriais específicos de K8s que Datadog/Prometheus |
| Datadog | Ferramenta de referência de mercado, ótima integração K8s | Trial de **14 dias** — expira antes da avaliação do projeto, que acontece depois de a infraestrutura já ter sido destruída ao fim das sessões do lab |
| Prometheus + Grafana self-hosted no próprio EKS | Sem dependência de conta externa, controle total | Mais um componente para operar dentro de um cluster já com orçamento apertado (CPU/memória extra, storage para métricas); dashboards/alertas ficam presos ao cluster, que é destruído a cada fim de sessão — perde-se o histórico entre sessões, justamente o oposto do que se quer para avaliação posterior |
| CloudWatch (nativo AWS) | Sem conta externa | Dashboards mais pobres que os concorrentes; alertas por e-mail exigem SNS, que soma mais um componente; menos aderente ao pedido de "dashboards" ricos do enunciado |

## Decisão

**New Relic**, pelo free tier sem prazo de validade — critério decisivo para um
projeto de curso cuja infraestrutura é destruída ao fim de cada sessão de trabalho
(orçamento do Learner Lab) mas cujos dashboards precisam continuar acessíveis para a
banca avaliar depois.

Componentes:
- Agente APM no processo Node.js da API.
- Lambda instrumentada via layer do New Relic.
- `nri-bundle` via Helm no EKS, para métricas de pods/nós/eventos do cluster.
- Forwarder de logs consumindo o stdout JSON estruturado (`pino`) dos pods, com
  `correlationId` como atributo indexado — liga log → trace → requisição.

## Consequências

- Dashboards ficam acessíveis via link mesmo depois que a infraestrutura AWS for
  destruída (desde que a conta New Relic e o volume de dados retido permaneçam), o que
  não seria verdade com Prometheus/Grafana rodando só dentro do cluster efêmero.
- Risco de estourar o free tier de 100 GB/mês por volume de logs — mitigado com
  amostragem de nível `debug` e retenção curta (ver `PHASE_3_PLAN.md`, seção de
  riscos).
- Métrica de negócio customizada (`OrdemServicoStatusChanged`, tempo médio por status)
  exige um ajuste pequeno de assinatura em `notificar-mudanca-status.helper.ts` e nos 6
  use-cases de transição de status que o chamam, para propagar o status anterior junto
  com a OS já atualizada.

## Referências

- `PHASE_3_PLAN.md`, Etapa 5
