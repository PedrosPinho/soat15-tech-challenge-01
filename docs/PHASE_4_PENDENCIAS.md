# Pendências do usuário — Fase 4

Lista viva do que **ainda falta**. Última atualização: 2026-11-16, depois do primeiro deploy em `homolog` e dos
cenários feliz e de recusa validados na AWS. Legenda: ⛔ entrega/bloqueia · 🔶 valida o que só está "escrito" · ⚪ opcional.

Roteiro do vídeo: [`ROTEIRO_VIDEO_FASE4.md`](ROTEIRO_VIDEO_FASE4.md). Passo a passo das contas externas: [`PHASE_4_EXECUTION_GUIDE.md`](PHASE_4_EXECUTION_GUIDE.md).

## Estado atual (já feito)

| Área | Situação |
|---|---|
| Código e docs das Etapas 2–9 | Concluídos, nos 6 repos |
| Repositórios | OS, Billing, Execution, db-infra, k8s-infra e auth-lambda no GitHub; PRs `feat/fase4-*` → `homolog` **mergeados** |
| Infra em `homolog` (conta `368596537549`) | db-infra (RDS), k8s-infra (EKS, 2 nós `t3.medium`), OS, Execution, Billing e auth-lambda (API Gateway) **aplicados pelo CI** |
| Gateway | `https://1meh3wq1p3.execute-api.us-east-1.amazonaws.com` (`/health/ready` UP, login, token por CPF, webhook com HMAC) |
| Mercado Pago (sandbox) | Conta, token de teste e assinatura do webhook no SSM; `MP_NOTIFICATION_URL` criado; compradora de teste criada |
| Fluxo na AWS | **Feliz**: OS `FINALIZADA`, saga `CONCLUIDA`, receita no dashboard. **Recusa (`OTHE`)**: saga `COMPENSADA`, OS/orçamento/execução cancelados |
| Validação local com Docker | Smoke ponta a ponta, LocalStack, Postgres real, `docker build` dos 3 serviços; OS com **96,6 % linhas / 88,2 % branches** (741 testes) |
| Qualidade | Sonar roda **local** (`docker-compose.sonar.yml` + `scripts/sonar-local.sh`); os 3 serviços passam no quality gate. O job `Sonar` do CI passa com aviso sem `SONAR_HOST_URL`/`SONAR_TOKEN` |
| Secrets | `AWS_*` nos 6 repos; `INTERNAL_API_TOKEN` (OS, Billing, auth-lambda); `WEBHOOK_SECRET` e `MP_NOTIFICATION_URL` (Billing); Environments `homolog`/`prod` nos 6 repos |
| Passo 0 do Learner Lab | SQS, SNS com filter policy, DynamoDB e `t3.medium` validados |

## 1. Fechar o Git (PRs abertos)

- [ ] ⛔ **Mergear os 6 PRs `homolog` → `main`** (só fazem `plan`, ADR-007): [OS #13](https://github.com/PedrosPinho/soat15-tech-challenge-01/pull/13), [Billing #4](https://github.com/PedrosPinho/soat15-tech-challenge-billing-service/pull/4), [Execution #5](https://github.com/PedrosPinho/soat15-tech-challenge-execution-service/pull/5), [db-infra #8](https://github.com/PedrosPinho/soat15-tech-challenge-db-infra/pull/8), [k8s-infra #10](https://github.com/PedrosPinho/soat15-tech-challenge-k8s-infra/pull/10), [auth-lambda #11](https://github.com/PedrosPinho/soat15-tech-challenge-auth-lambda/pull/11). O `Terraform plan` pode falhar em `main` (estado de `prod` inexistente) e isso é esperado.
- [ ] ⛔ Mergear o PR de documentação [OS #14](https://github.com/PedrosPinho/soat15-tech-challenge-01/pull/14) (compensação, pendências e roteiro do vídeo) em `homolog`; depois ele segue para `main` num PR de promoção.
- [ ] ⚪ **`main` do OS**: a `main` remota ainda tem 3 commits de agosto com `Co-Authored-By: Claude` (`bffb42c`, `d2893a2`, `3536d4e`), porque o force-push na `main` foi recusado (branch protegida). Para limpar: desligue a proteção da `main` do OS, me avise para o `git push --force-with-lease origin main` e religue. Se preferir manter, nada a fazer.
- [ ] ⚪ `docs/` está no `.gitignore` do OS (os docs da fase foram adicionados com `git add -f`). Decida se mantém o ignore.

## 2. Permissões e proteção de branches

- [ ] ⛔ Adicionar **`soat-architecture`** como colaborador nos 2 repos novos (`…-billing-service` e `…-execution-service`) e conferir nos outros 4 (T0.3, Guia Passo 1).
- [ ] ⛔ **Branch protection** (PR obrigatório + checks `Build`, `Test`, `Sonar` em `main`/`homolog`): `./scripts/protect-branches.sh --dry-run` e depois sem a flag. Rode **só depois** de os 3 checks estarem verdes em um PR; senão ninguém consegue mergear. Tire prints para o PDF.

## 3. Observabilidade (New Relic)

O OS tem `NEW_RELIC_LICENSE_KEY`, e o k8s-infra tem licença, `NEW_RELIC_ACCOUNT_ID` e `NEW_RELIC_API_KEY`. **Billing e Execution não têm a licença**, então o agente deles está desligado: o trace OS → Billing → OS fica quebrado até isso mudar.

- [ ] ⛔ Criar `NEW_RELIC_LICENSE_KEY` no **Billing** e no **Execution** (mesma chave) e reexecutar o job `Deploy (EKS)` de cada um.
- [ ] ⛔ Verificar se o k8s-infra criou o dashboard **"Oficina — Saga / Microsserviços"** e os 4 alertas (precisa de `enable_new_relic_dashboards=true`, `new_relic_api_key` e `new_relic_account_id`; ver o README do k8s-infra). Se não, ajustar e reaplicar.
- [ ] ⛔ `ALERT_NOTIFICATION_EMAIL` (secret referenciado em 2 workflows): crie nos repos que o usam, com o e-mail dos alertas.
- [ ] 🔶 **Trace distribuído**: depois do item acima, abrir *Distributed tracing* (filtrar por `ordemServicoId`) e conferir que o trace atravessa OS → Billing → OS. Se quebrar na fila, olhar o campo `trace` do envelope e os MessageAttributes `traceparent`/`newrelic`.
- [ ] 🔶 Conferir contra dados reais os eventos/atributos (`SagaIniciada`, `SagaPassoExecutado`, `SagaFinalizada`, `FilaProfundidade`), a NRQL do billboard de DLQ e o `transactionName` do webhook do Mercado Pago. Ajustar em `k8s-infra/newrelic_saga.tf`.
- [ ] 🔶 **Forçar uma mensagem na DLQ** (JSON inválido em `…-billing-commands`) e conferir que o alerta "Mensagem em DLQ" dispara (≤ ~6 min).
- [ ] ⚪ O alerta "taxa de compensação > 50 %" é ruidoso com pouco volume; ajuste o limiar se disparar à toa.

## 4. Ensaio e vídeo (≤ 15 min)

O roteiro com tempos, falas e comandos está em [`ROTEIRO_VIDEO_FASE4.md`](ROTEIRO_VIDEO_FASE4.md). Antes de gravar:

- [ ] 🔶 **Cancelamento depois de pago → estorno** (`reparo/falhar`): é o único cenário de compensação ainda não exercitado na AWS com o Mercado Pago real (bloco 3b do roteiro). Pague uma OS com `APRO`, chame `reparo/falhar` e confira a saga e o reembolso no painel do Mercado Pago.
- [ ] 🔶 **Token por CPF do cliente de teste** (`POST /auth/token` com `52998224725`): só o CPF inválido foi testado (400).
- [ ] 🔶 **Resiliência** (bloco 4): `kubectl scale deployment/billing-service … --replicas=0`, criar OS, voltar a 1 e conferir que a saga continua.
- [ ] 🔶 Passo 0, item 5 (pod → SQS/DynamoDB via `LabRole`): implícito no fluxo (os 3 serviços publicam e consomem filas), mas o `kubectl run awscli` não foi rodado.
- [ ] ⛔ **Gravar o vídeo** numa sessão do lab ativa, com a passada seca feita na mesma sessão; upload no YouTube como **não listado**.
- [ ] 🔶 Importar `docs/postman/oficina-fase4-fluxo-completo.postman_collection.json` no Postman e rodar (nunca foi aberta no Postman real).

## 5. PDF do portal

- [ ] ⛔ **PDF** (Passo 9 do guia): nomes e RMs, links dos 6 repositórios, link do vídeo, diagrama geral da arquitetura, estratégia da Saga (resumo do `ADR-009` + diagrama de sequência com compensação) e justificativa da divisão e das tecnologias (`RFC-005`, `ADR-008`, `ADR-010`, `ADR-011`, `ADR-014`).
- [ ] ⛔ Exportar os diagramas Mermaid de `docs/architecture/` como imagem (mermaid.live ou extensão do VS Code) e **conferir que renderizam no GitHub** (`sequenceDiagram` com `-)`/`--)`).
- [ ] ⚪ Prints para o PDF: painel do SonarQube local (quality gate e cobertura dos 3 serviços), branch protection e o dashboard do New Relic.

## 6. Decisões que ainda pedem sua confirmação

- [ ] `GerarOrcamento.itens[].referenciaId` de itens `SERVICO` é o **id do serviço da OS** (a entidade não guarda o `catalogoServicoId`). Ajustado em `contratos-mensagens.md`; o Billing já segue.
- [ ] `ReparoIniciado`/`DiagnosticoIniciado` são enviados ao **aceitar o comando**, não quando o mecânico age. O OS trata `ReparoIniciado` só como log. Se preferir o evento na ação do mecânico, é mudança pequena no Execution.
- [ ] Em `FALHA_COMPENSACAO` a OS **não** é cancelada (dinheiro/estado exigem intervenção manual). Cartão recusado compensa a Saga na primeira tentativa.
- [ ] ECR do OS passou a `soat15-tc-os-service` (o antigo `soat15-tc-oficina-api` é do `k8s-infra`); revise referências antigas.
- [ ] ⚪ Os repos de infra leem `terraform_remote_state` do workspace `homolog` fixo (herança da Fase 3): em `prod` não há ambiente real (ADR-007).

## 7. Encerramento (segurança e custo)

- [ ] ⛔ **Revogar/regenerar o que passou pelo chat**: token do GitHub (PAT), credenciais da AWS (expiram com a sessão do lab), `access token` e assinatura do webhook do Mercado Pago, e a senha da conta compradora, se foi compartilhada.
- [ ] ⛔ **Derrubar a infra ao terminar** (EKS, 2 nós `t3.medium` e RDS cobram): `destroy.yml` (Actions → Run workflow) em cada repo, em ordem inversa: auth-lambda → Billing/Execution/OS → k8s-infra → db-infra. O passo de workloads remove o Ingress primeiro para o ALB não ficar órfão.
- [ ] ⚪ Os parâmetros SSM `/soat15-tc/homolog/billing/*` e `jwt-secret` sobrevivem ao `destroy` do serviço; guarde os valores num gerenciador de senhas. Se o lab for resetado, recrie na ordem da tabela abaixo.
- [ ] ⚪ Os `AWS_*` dos secrets expiram a cada sessão: renove com `./scripts/refresh-aws-secrets.sh` (precisa da `aws` CLI e do `gh`) ou `gh secret set`.

## Registro do primeiro deploy em `homolog` (T8.5, 2026-11-16)

Ordem executada: db-infra → k8s-infra → OS → Execution + Billing → auth-lambda, tudo pelo CI (merge dos PRs).
**Para um ambiente do zero**, aplique o `jwt-secret` do auth-lambda **antes do OS** (item 2 da tabela) e publique um
`mp-webhook-secret` provisório antes do Billing (item 3).

| # | Achado | Resolução |
|---|---|---|
| 1 | Conta AWS do Learner Lab mudou (`442534931336` → `368596537549`): bucket de estado inexistente e `LabRole` com ID fixo em 16 arquivos | Bucket `soat15-tc-tfstate-368596537549` (versionado, criptografado) e tabela de lock criados; ID trocado nos `backend.tf`/`variables.tf`/`remote_state.tf` dos 6 repos |
| 2 | **Dependência circular do `jwt-secret`**: é criado pelo Terraform do auth-lambda (último), mas o deploy do OS o lê | `terraform apply -target=random_password.jwt_secret -target=aws_ssm_parameter.jwt_secret` no workspace `homolog` do auth-lambda **antes** do OS |
| 3 | **Dependência circular do `mp-webhook-secret`**: o Mercado Pago só gera a assinatura depois de cadastrar a URL do webhook, que só existe com o API Gateway; o deploy do Billing o lê | Valor provisório aleatório no SSM, substituído depois pelo segredo real (versão 2) e novo deploy do Billing |
| 4 | Histórico reescrito (limpeza de trailers) divergiu da `homolog` remota: PRs do OS e do auth-lambda ficaram `CONFLICTING` e o CI não rodava | Commits da Fase 4 reaplicados (cherry-pick) sobre `origin/homolog`; force-push das branches `feat/fase4-*` |
| 5 | Billing/Execution: PRs novos não disparavam o Actions | Um PR de teste descartável destravou; depois recriar o PR real |
| 6 | `Terraform plan` dos PRs de Billing, Execution, auth-lambda e k8s-infra falhava antes do 1º apply (lê `terraform_remote_state` de quem ainda não foi aplicado) | Esperado; passa depois do apply na ordem. Não é check obrigatório |
| 7 | Checkout Pro: "uma das partes é de teste" | Pagar em janela anônima, logada só como a compradora de teste |

Evidências guardadas: OS finalizada `5df0bb03-0879-4567-8c8d-2a15883dcf91` (pagamento MP `189941409088`) e OS recusada
`ddcae8df-0d8d-452d-99e6-bdadca3e69c7` (pagamento MP `188865471215`, saga `COMPENSADA`).
