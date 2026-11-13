# Pendências do usuário — Fase 4

Lista viva do que **só você pode fazer** (contas externas, AWS, Docker) ou decidir. Atualizada a cada etapa.
Última atualização: 2026-11-13, após o push dos 6 repos e a limpeza do histórico (sem trailer Claude). Legenda: ⛔ bloqueia o primeiro deploy · 🔶 valida o que está só "escrito" · ⚪ opcional.

Detalhes passo a passo das contas externas: [`PHASE_4_EXECUTION_GUIDE.md`](PHASE_4_EXECUTION_GUIDE.md).

## 1. Repositórios e Git

- [x] Repos `billing-service` e `execution-service` criados e enviados (`main`, `homolog` e branches `feat/fase4-*`). Remotes via SSH com a chave `gh_id_ed25519`.
- [ ] ⛔ Adicionar `soat-architecture` como colaborador nos 2 repos novos (T0.3, Guia Passo 1).
- [x] Branches `feat/fase4-*` enviadas nos 6 repos (OS, Billing, Execution, db-infra, k8s-infra, auth-lambda). Histórico reescrito para remover `Co-Authored-By: Claude`; todos os commits são de `pedrospinho`.
- [ ] ⛔ **`main` do OS**: o force-push foi recusado (GH006, branch protegida). A `main` remota ainda tem 3 commits de agosto com trailer Claude (`bffb42c`, `d2893a2`, `3536d4e`) e a `main` local está divergente. Para limpar: desligue a proteção da `main` do OS, avise-me para dar o `git push --force-with-lease origin main` e religue a proteção. Se preferir manter, rode `git fetch && git branch -f main origin/main` no OS; as `feat/fase4-*` não dependem disso.
- [ ] ⛔ Abrir PRs das branches `feat/fase4-*` contra `homolog`, em ordem de etapa (cada uma é cumulativa; ou só a `etapa9` de cada repo):
  | Repo | Branches |
  |---|---|
  | `soat15-tech-challenge-01` (OS) | `etapa1`, `2`, `5`, `6`, `7`, `8`, `9` |
  | `…-execution-service` | `etapa3`, `6`, `7`, `8`, `9` |
  | `…-billing-service` | `etapa4`, `6`, `7`, `8`, `9` |
  | `db-infra` | `etapa5` |
  | `k8s-infra` | `etapa5`, `7` |
  | `auth-lambda` | `etapa5` |
- [ ] ⚪ Hashes de commits citados em mensagens/docs anteriores mudaram com a reescrita de histórico (OS, Billing, Execution, db-infra, k8s-infra, auth-lambda).
- [ ] ⚪ Nos repos Billing e Execution, o commit inicial do esqueleto (Etapa 1) está **direto na `main`** (feito antes da regra "só em branches"). Se quiser, reorganize antes do primeiro push.
- [ ] ⚪ `docs/` está no `.gitignore` do OS: os docs da fase foram adicionados com `git add -f`. Decida se mantém o ignore.
- [ ] 🔶 Branch protection em `main`/`homolog` dos 2 repos novos (PR + status checks `Build` e `Test`).

## 2. Validação com Docker (nada disto rodou: o ambiente de desenvolvimento não tem Docker)

- [ ] 🔶 **Smoke ponta a ponta** (o teste mais importante que ainda não rodou): no OS, `docker compose -f docker-compose.integration.yml up --build -d` e `./scripts/smoke-fluxo-feliz.sh` (precisa de `curl` e `jq`; os repos `billing-service` e `execution-service` clonados ao lado). Se falhar, o script diz em qual passo; ajustes prováveis: shape de alguma resposta do OS, tempo de espera, variável de ambiente.
- [ ] 🔶 Rodar também as suítes `LOCALSTACK_ENDPOINT=http://localhost:4566 npx jest tests/integration/messaging-localstack` nos 3 repos (adapter SQS/SNS real: raw delivery, filter policy, DLQ).
- [ ] 🔶 **OS**: `npm test` com Docker (10 suítes dependem de Testcontainers: 7 repositórios Postgres, 2 integração, `messaging.spec.ts`) e `docker compose up` (LocalStack + `scripts/localstack-init.sh`). A cobertura global do OS **não foi medida**.
- [ ] 🔶 **Execution**: `docker compose up --build`; `LOCALSTACK_ENDPOINT=http://localhost:4566 npm test` (ativa `tests/integration-localstack.spec.ts`, 6 testes).
- [ ] 🔶 **Billing**: `docker compose up --build`; `TEST_DATABASE_URL=postgres://oficina:senha123@localhost:5433/oficina_billing npm test` (ativa `tests/integration.postgres.spec.ts`, 5 testes).
- [ ] 🔶 `docker build` dos 3 serviços (nenhuma imagem foi construída).
- [ ] 🔶 Fluxo ponta a ponta local (3 serviços + LocalStack): criar OS → diagnóstico → orçamento → aprovar → pagamento → reparo, e o caminho de compensação. Ainda não existe teste E2E multi-serviço (Etapa 6).
- [ ] ⚪ `tflint` nos `terraform/` dos 6 repos (não instalado no ambiente).
- [ ] 🔶 **Bootstrap do banco** (`k8s/db-bootstrap.sql`): nunca rodou. Teste com `psql` como `billing_service` em `oficina_os` ⇒ `permission denied for database`; e `os_service` conectando em `oficina_os` com a URL do Secret.
- [ ] 🔶 **Lambda de token** contra o ambiente real: `POST /auth/token` com os mesmos CPFs da Fase 3 (200/400/403/404). Lembre: o database `oficina_os` nasce vazio — o seed do OS recria admin e cliente de teste.
- [ ] 🔶 `kubectl get pods -A` sem `Pending` com os 3 serviços (`t3.medium`); se faltar memória, desligar `kubeEvents` no `nri-bundle`.

## 3. Contas externas (Etapa 0)

- [ ] ⛔ **T0.1** Validar no Learner Lab: SQS, SNS (+ assinatura SQS com filter policy), DynamoDB on-demand, node group `t3.medium` (Guia Passo 0).
- [ ] ⛔ **T0.2** Pod do EKS acessando SQS/DynamoDB com a `LabRole` via IMDS. Se falhar, subir `HttpPutResponseHopLimit` dos nós para 2.
- [ ] ⛔ **T0.4** Conta Mercado Pago Developers: aplicação (Checkout Pro), credenciais **de teste**, usuários vendedor/comprador, webhook secret (Guia Passo 2). Publicar no SSM (sem colar em chat/arquivo):
  `/soat15-tc/<env>/billing/mp-access-token` e `/soat15-tc/<env>/billing/mp-webhook-secret`.
- [ ] 🔶 **T4.3** Teste manual do `MercadoPagoPaymentGateway` no sandbox: criar preferência, abrir o `sandbox_init_point`, pagar com titular `APRO` (aprovado) e `OTHE` (recusado), conferir o webhook assinado e o estorno. O adapter só foi testado com `fetch` simulado — **o formato real das respostas/assinatura do MP pode exigir ajuste**.
- [ ] ⚪ **T0.5** SonarCloud: organização, 3 projetos (analysis method *GitHub Actions*), `SONAR_TOKEN` em cada repo (Guia Passo 3). Só é usado na Etapa 8.
- [ ] 🔶 **SonarCloud (T6.4)**: confirmar `sonar.organization` (`pedrospinho`) e `sonar.projectKey` (`pedrospinho_<repo>`) em cada `sonar-project.properties` — são presumidos pelo padrão do SonarCloud.
- [ ] ⚪ New Relic: `NEW_RELIC_LICENSE_KEY` como GitHub Secret (sem ela o agente fica desligado, sem erro).

## 4. GitHub Secrets / Environments (por repo)

| Secret | OS | Execution | Billing | Observação |
|---|:-:|:-:|:-:|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | ✅ | ✅ | ✅ | Learner Lab, renovar a cada sessão (T0.6) |
| `INTERNAL_API_TOKEN` | ✅ | — | ✅ | **mesmo valor** nos serviços e na Lambda de auth (substitui `WEBHOOK_SECRET` no OS) |
| `WEBHOOK_SECRET` | — | — | ✅ | aprovação externa de orçamento (migrou do OS) |
| `MP_NOTIFICATION_URL` | — | — | ✅ | URL pública do webhook no API Gateway — só existe após o 1º deploy do gateway (Etapa 5/T5.4) |
| `NEW_RELIC_LICENSE_KEY` | ⚪ | ⚪ | ⚪ | |

**Repos de infra** (`db-infra`, `k8s-infra`, `auth-lambda`) também precisam dos 3 `AWS_*`. O `auth-lambda` ganhou um secret novo: **`INTERNAL_API_TOKEN`** (mesmo valor dos serviços; vira `TF_VAR_internal_api_token` e entra na Lambda de token).
| `SONAR_TOKEN` | ⚪ | ⚪ | ⚪ | Etapa 8 |

- [ ] ⛔ Criar os Environments `homolog` e `prod` nos repos que os usam (os jobs `terraform-apply` e `deploy` referenciam `environment:`).
- [ ] ⛔ **T0.6** `scripts/refresh-aws-secrets.sh` já publica nos **6** repos (`--dry-run` lista). Falta você rodá-lo com as credenciais do Learner Lab no início de cada sessão.

## 5. Ordem do primeiro deploy

1. Plataforma: `db-infra` (gera as senhas dos roles no SSM) → `k8s-infra` (nós `t3.medium`). Com estado antigo da Fase 3, o `apply` do `k8s-infra` **troca o node group** (instância mudou) e o do `db-infra` tira a regra Lambda→RDS do SG.
2. **OS Service** primeiro (dono do tópico SNS `oficina-eventos` e da fila `os-saga-replies`; o Terraform dos outros dois lê o estado dele). O deploy do OS roda o **Job de bootstrap** que cria `oficina_os`/`oficina_billing` e os roles — o Billing depende dele.
3. Execution e Billing (qualquer ordem). Billing exige antes o bootstrap feito pelo deploy do OS.
4. `auth-lambda` **depois** dos Ingress (precisa do ALB): fase 1 do apply cria só a API e `POST /auth/token` (que responde 500 até a fase 2); com `enable_vpc_link_integration=true` (default) o `plan` falha se o ALB ainda não existir.
- [ ] ⛔ Rodar o `terraform apply` em `homolog` pelo push (o CI aplica só em `homolog`; em `main` só faz `plan`, ADR-007) e conferir no console: tabela `…-execucoes`, 2 filas de comando + DLQs, tópico `oficina-eventos`, fila `os-saga-replies` com a assinatura e a filter policy.

## 6. Decisões/contratos para você confirmar

- [ ] `GerarOrcamento.itens[].referenciaId` de itens `SERVICO` é o **id do serviço da OS** (a entidade não guarda o `catalogoServicoId`). Ajustado no `contratos-mensagens.md`; o Billing já segue.
- [ ] `ReparoIniciado`/`DiagnosticoIniciado` são enviados ao **aceitar o comando**, não quando o mecânico age (o mecânico inicia depois pela API, sem evento). O OS trata `ReparoIniciado` só como log. Se preferir o evento na ação do mecânico, é mudança pequena no Execution.
- [ ] Em `FALHA_COMPENSACAO` a OS **não** é cancelada (dinheiro/estado exigem intervenção manual). Cartão recusado compensa a Saga na primeira tentativa.
- [ ] ECR do OS passou a `soat15-tc-os-service` (o antigo `soat15-tc-oficina-api` é do `k8s-infra`). Alguma referência antiga (k8s-infra, docs da Fase 3) pode precisar atualizar.
- [ ] Aviso: o `db-infra`/`auth-lambda` da Fase 3 ainda **não** foram alterados (Etapa 5): a Lambda de CPF continua lendo o RDS direto, o que viola a regra da fase até T5.5.

## 7. Ainda é código meu (não é seu), por etapa

- Nada. Todas as etapas de código e documentação estão feitas; o que resta está nas seções acima e na 12.

## 8. Etapa 5 — o que mudou fora do OS (4 repos, branch `feat/fase4-etapa5`)

| Repo | Mudança |
|---|---|
| `db-infra` | senhas dos roles `os-service`/`billing-service` no SSM; SG do RDS sem a Lambda |
| `k8s-infra` | `node_instance_type = t3.medium`; comentários do ALB/nri-bundle |
| `auth-lambda` | token via HTTP no OS; VPC Link → ALB; rota pública do webhook MP; sem `pg`/RDS |
| `soat15-tech-challenge-01` (OS) | `k8s/db-bootstrap.sql` + Job; `DATABASE_URL` com `os_service`/`oficina_os`; `refresh-aws-secrets.sh` p/ 6 repos |
- [ ] ⛔ Push + PR dessas 3 branches nos repos de infra (`main`/`homolog` protegidas), na ordem do item 5.
- [ ] ⚪ Os repos de infra leem `terraform_remote_state` do workspace `homolog` fixo (herança da Fase 3): em `prod` não há ambiente real (ADR-007).

## 9. Etapa 6 — o que mudou (branch `feat/fase4-etapa6` nos 3 serviços)

- BDD `tests/bdd/` (OS), contratos `tests/contracts/` (3 repos), `tests/integration/messaging-localstack.spec.ts` (3 repos), `sonar-project.properties` (3 repos), `docker-compose.integration.yml` + `scripts/smoke-fluxo-feliz.sh` (OS).
- [ ] ⚪ Manter os contratos em dia: ao mudar qualquer mensagem, `UPDATE_CONTRACTS=1 npx jest tests/contracts` no produtor e copiar o JSON para o consumidor (README do OS, seção Qualidade).
- [ ] 🔶 Cobertura do OS só é conhecida no CI (sem Docker aqui: 86,6 % linhas / 77 % branches / 78,5 % funções; o threshold global de 80 % pode falhar se as suítes de Docker não cobrirem o restante — confira no primeiro run).

## 10. Etapa 7 — observabilidade (branch `feat/fase4-etapa7` nos 3 serviços + `k8s-infra`)

- [ ] ⛔ **Conta New Relic** (free tier): `NEW_RELIC_LICENSE_KEY` (ingestão) em cada repo de serviço e no `k8s-infra`; para os dashboards/alertas por Terraform também `new_relic_api_key` + `new_relic_account_id` e `enable_new_relic_dashboards=true` no `k8s-infra` (ver README dele). Sem a licença o agente fica desligado e nada quebra.
- [ ] 🔶 **Trace distribuído OS → Billing → OS**: depois do 1º deploy com licença, abrir *Distributed tracing*, filtrar por `ordemServicoId` e conferir que o trace atravessa os serviços (é o item do vídeo). Se o trace quebrar na fila, olhar o campo `trace` do envelope e os MessageAttributes `traceparent`/`newrelic`.
- [ ] 🔶 Conferir contra dados reais: nomes de evento/atributo (`SagaIniciada`, `SagaPassoExecutado`, `SagaFinalizada`, `FilaProfundidade`), a NRQL aninhada do billboard de DLQ e o `transactionName` do webhook MP (alerta). Ajustar em `k8s-infra/newrelic_saga.tf`.
- [ ] 🔶 **Forçar uma mensagem para a DLQ** (ex.: enviar JSON inválido a `…-billing-commands`) e conferir que o alerta "Mensagem em DLQ" dispara (≤ ~6 min: coleta de 60 s + janela de 5 min).
- [ ] ⚪ O alerta "taxa de compensação > 50 %" é ruidoso com pouco volume; ajuste o limiar/duração se disparar à toa no vídeo.

## 11. Etapa 8 — CI/CD (branch `feat/fase4-etapa8` nos 3 serviços)

- [ ] ⛔ **`SONAR_TOKEN`** como GitHub Secret nos 3 serviços (Guia Passo 3) — sem ele o job `Sonar` falha e, sendo check obrigatório, bloqueia merge e o `terraform apply`.
- [ ] ⛔ **Branch protection**: com os remotos criados, `./scripts/protect-branches.sh --dry-run` e depois sem a flag (cria PR obrigatório + checks `Build`, `Test`, `Sonar` em `main`/`homolog` dos 3 serviços). Só rode **depois** de o `Sonar` rodar uma vez verde, senão ninguém consegue mergear.
- [ ] ⛔ **T8.5 — primeira execução real em `homolog`** dos 3 pipelines (ordem: OS → Execution/Billing). Espere bugs: registre cada um em `PHASE_4_TASKS.md` (seção Etapa 8) como na Fase 3. Candidatos prováveis: nome de output/parâmetro SSM, permissão da LabRole, `kubectl wait` do Job de bootstrap, `sonar.organization`/`projectKey`, shape de resposta no smoke.
- [ ] 🔶 Conferir no 1º `plan` de PR que `terraform_remote_state` do OS resolve (o OS precisa ter aplicado antes no mesmo workspace).
- [ ] ⚪ `destroy.yml` (Actions → Run workflow) ao fim de cada sessão do Learner Lab, na ordem do cabeçalho; o passo de workloads remove o Ingress primeiro para o ALB não ficar órfão.

## 12. Etapa 9 — entregáveis finais (branch `feat/fase4-etapa9`)

- [ ] ⛔ **Vídeo (≤ 15 min)** (T9.6) — roteiro no Passo 8 do `PHASE_4_EXECUTION_GUIDE.md`; gravar numa sessão do lab recém-aplicada, depois de rodar o fluxo completo e as falhas. Material pronto: collection Postman `docs/postman/oficina-fase4-fluxo-completo.postman_collection.json` (pasta "Falhas e compensações") e `scripts/smoke-fluxo-feliz.sh`.
- [ ] ⛔ **PDF do portal** (T9.7) — conteúdo no Passo 9 do guia. Os diagramas (componentes, sequência feliz e de compensação) estão em Mermaid em `docs/architecture/`; exporte como imagem (mermaid.live ou a extensão do VS Code). Inclua prints de branch protection, quality gate e cobertura.
- [ ] 🔶 **Importar a collection no Postman** e rodar contra o compose de integração (nunca foi aberta no Postman real).
- [ ] 🔶 Conferir que os **badges do SonarCloud** do README do OS apontam para o `projectKey` real.
- [ ] 🔶 Conferir que o Mermaid dos diagramas **renderiza no GitHub** (sintaxe validada só por leitura; ex.: `sequenceDiagram` com `-)`/`--)`).
- [ ] ⚪ Push das branches `feat/fase4-etapa*` e PRs para `homolog` (e depois `main`), na ordem das etapas; as branches de etapa são cumulativas (cada uma parte da anterior).
