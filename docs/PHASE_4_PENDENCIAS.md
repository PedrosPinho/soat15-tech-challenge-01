# Pendências do usuário — Fase 4

Lista viva do que **só você pode fazer** (contas externas, AWS, Docker) ou decidir. Atualizada a cada etapa.
Última atualização: 2026-11-12, após a Etapa 4. Legenda: ⛔ bloqueia o primeiro deploy · 🔶 valida o que está só "escrito" · ⚪ opcional.

Detalhes passo a passo das contas externas: [`PHASE_4_EXECUTION_GUIDE.md`](PHASE_4_EXECUTION_GUIDE.md).

## 1. Repositórios e Git

- [ ] ⛔ Criar no GitHub os repos públicos `soat15-tech-challenge-billing-service` e `soat15-tech-challenge-execution-service`, adicionar `soat-architecture` como colaborador e dar `git remote add origin … && git push -u origin main homolog` (T0.3, Guia Passo 1).
- [ ] ⛔ Dar push das branches de trabalho e abrir PRs (nada foi enviado ao remoto):
  | Repo | Branch | Conteúdo |
  |---|---|---|
  | `soat15-tech-challenge-01` (OS) | `feat/fase4-etapa1` → `feat/fase4-etapa2` | contratos, RFC/ADRs; refactor do OS + Saga |
  | `…-execution-service` | `feat/fase4-etapa3` | Execution Service |
  | `…-billing-service` | `feat/fase4-etapa4` | Billing Service |
- [ ] ⚪ Nos repos Billing e Execution, o commit inicial do esqueleto (Etapa 1) está **direto na `main`** (feito antes da regra "só em branches"). Se quiser, reorganize antes do primeiro push.
- [ ] ⚪ `docs/` está no `.gitignore` do OS: os docs da fase foram adicionados com `git add -f`. Decida se mantém o ignore.
- [ ] 🔶 Branch protection em `main`/`homolog` dos 2 repos novos (PR + status checks `Build` e `Test`).

## 2. Validação com Docker (nada disto rodou: o ambiente de desenvolvimento não tem Docker)

- [ ] 🔶 **OS**: `npm test` com Docker (10 suítes dependem de Testcontainers: 7 repositórios Postgres, 2 integração, `messaging.spec.ts`) e `docker compose up` (LocalStack + `scripts/localstack-init.sh`). A cobertura global do OS **não foi medida**.
- [ ] 🔶 **Execution**: `docker compose up --build`; `LOCALSTACK_ENDPOINT=http://localhost:4566 npm test` (ativa `tests/integration-localstack.spec.ts`, 6 testes).
- [ ] 🔶 **Billing**: `docker compose up --build`; `TEST_DATABASE_URL=postgres://oficina:senha123@localhost:5433/oficina_billing npm test` (ativa `tests/integration.postgres.spec.ts`, 5 testes).
- [ ] 🔶 `docker build` dos 3 serviços (nenhuma imagem foi construída).
- [ ] 🔶 Fluxo ponta a ponta local (3 serviços + LocalStack): criar OS → diagnóstico → orçamento → aprovar → pagamento → reparo, e o caminho de compensação. Ainda não existe teste E2E multi-serviço (Etapa 6).
- [ ] ⚪ `tflint` nos 3 `terraform/` (não instalado no ambiente).

## 3. Contas externas (Etapa 0)

- [ ] ⛔ **T0.1** Validar no Learner Lab: SQS, SNS (+ assinatura SQS com filter policy), DynamoDB on-demand, node group `t3.medium` (Guia Passo 0).
- [ ] ⛔ **T0.2** Pod do EKS acessando SQS/DynamoDB com a `LabRole` via IMDS. Se falhar, subir `HttpPutResponseHopLimit` dos nós para 2.
- [ ] ⛔ **T0.4** Conta Mercado Pago Developers: aplicação (Checkout Pro), credenciais **de teste**, usuários vendedor/comprador, webhook secret (Guia Passo 2). Publicar no SSM (sem colar em chat/arquivo):
  `/soat15-tc/<env>/billing/mp-access-token` e `/soat15-tc/<env>/billing/mp-webhook-secret`.
- [ ] 🔶 **T4.3** Teste manual do `MercadoPagoPaymentGateway` no sandbox: criar preferência, abrir o `sandbox_init_point`, pagar com titular `APRO` (aprovado) e `OTHE` (recusado), conferir o webhook assinado e o estorno. O adapter só foi testado com `fetch` simulado — **o formato real das respostas/assinatura do MP pode exigir ajuste**.
- [ ] ⚪ **T0.5** SonarCloud: organização, 3 projetos (analysis method *GitHub Actions*), `SONAR_TOKEN` em cada repo (Guia Passo 3). Só é usado na Etapa 8.
- [ ] ⚪ New Relic: `NEW_RELIC_LICENSE_KEY` como GitHub Secret (sem ela o agente fica desligado, sem erro).

## 4. GitHub Secrets / Environments (por repo)

| Secret | OS | Execution | Billing | Observação |
|---|:-:|:-:|:-:|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | ✅ | ✅ | ✅ | Learner Lab, renovar a cada sessão (T0.6) |
| `INTERNAL_API_TOKEN` | ✅ | — | ✅ | **mesmo valor** nos serviços e na Lambda de auth (substitui `WEBHOOK_SECRET` no OS) |
| `WEBHOOK_SECRET` | — | — | ✅ | aprovação externa de orçamento (migrou do OS) |
| `MP_NOTIFICATION_URL` | — | — | ✅ | URL pública do webhook no API Gateway — só existe após o 1º deploy do gateway (Etapa 5/T5.4) |
| `NEW_RELIC_LICENSE_KEY` | ⚪ | ⚪ | ⚪ | |
| `SONAR_TOKEN` | ⚪ | ⚪ | ⚪ | Etapa 8 |

- [ ] ⛔ Criar os Environments `homolog` e `prod` nos repos que os usam (os jobs `terraform-apply` e `deploy` referenciam `environment:`).
- [ ] ⛔ **T0.6** Atualizar `scripts/refresh-aws-secrets.sh` (OS) para publicar nos **6** repos — **ainda não feito** (é uma task de código minha, pendente).

## 5. Ordem do primeiro deploy

1. Plataforma: `db-infra` → `k8s-infra` (com as mudanças da Etapa 5, ainda **não implementadas**: bootstrap dos databases/roles, node `t3.medium`, VPC Link para o ALB).
2. **OS Service** primeiro (dono do tópico SNS `oficina-eventos` e da fila `os-saga-replies`; o Terraform dos outros dois lê o estado dele).
3. Execution e Billing (qualquer ordem). Billing exige antes o database `oficina_billing`, o role `billing_service` e o SSM `/soat15-tc/<env>/db/billing-service-password` (T5.1/T5.2).
4. `auth-lambda` (aponta para o ALB; Etapa 5).
- [ ] ⛔ Rodar o `terraform apply` em `homolog` pelo push (o CI aplica só em `homolog`; em `main` só faz `plan`, ADR-007) e conferir no console: tabela `…-execucoes`, 2 filas de comando + DLQs, tópico `oficina-eventos`, fila `os-saga-replies` com a assinatura e a filter policy.

## 6. Decisões/contratos para você confirmar

- [ ] `GerarOrcamento.itens[].referenciaId` de itens `SERVICO` é o **id do serviço da OS** (a entidade não guarda o `catalogoServicoId`). Ajustado no `contratos-mensagens.md`; o Billing já segue.
- [ ] `ReparoIniciado`/`DiagnosticoIniciado` são enviados ao **aceitar o comando**, não quando o mecânico age (o mecânico inicia depois pela API, sem evento). O OS trata `ReparoIniciado` só como log. Se preferir o evento na ação do mecânico, é mudança pequena no Execution.
- [ ] Em `FALHA_COMPENSACAO` a OS **não** é cancelada (dinheiro/estado exigem intervenção manual). Cartão recusado compensa a Saga na primeira tentativa.
- [ ] ECR do OS passou a `soat15-tc-os-service` (o antigo `soat15-tc-oficina-api` é do `k8s-infra`). Alguma referência antiga (k8s-infra, docs da Fase 3) pode precisar atualizar.
- [ ] Aviso: o `db-infra`/`auth-lambda` da Fase 3 ainda **não** foram alterados (Etapa 5): a Lambda de CPF continua lendo o RDS direto, o que viola a regra da fase até T5.5.

## 7. Ainda é código meu (não é seu), por etapa

- Etapa 5 — plataforma: bootstrap do DB/roles (T5.1–T5.2), `t3.medium` (T5.3), VPC Link/ALB e rota pública do webhook MP (T5.4), Lambda de token via `/internal/clientes/by-cpf` (T5.5).
- Etapa 6 — testes: E2E/BDD multi-serviço, cobertura do OS, role `os_service`/database `oficina_os` (T2.18).
- Etapa 7 — observabilidade distribuída (New Relic, propagação de `traceparent`).
- Etapa 8 — CI/CD final (SonarCloud). Etapa 9 — README, diagramas, vídeo (o roteiro é seu).
