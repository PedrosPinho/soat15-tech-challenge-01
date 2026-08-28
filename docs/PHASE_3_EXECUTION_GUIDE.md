# Guia de Execução — Fase 3

Checklist prático, em ordem de execução, para as partes da Fase 3 que exigem acesso a
contas externas (AWS Academy Learner Lab, GitHub) e que, por isso, **um agente de
código não pode fazer sozinho**. Complementa o backlog completo e as justificativas de
cada decisão em [`PHASE_3_PLAN.md`](PHASE_3_PLAN.md) — leia lá o "porquê"; aqui está o
"o que fazer, na ordem certa".

O que **já foi feito em código** nesta sessão, sem depender de conta nenhuma:
- Documentação arquitetural completa em [`docs/architecture/`](architecture/)
  (diagrama de componentes, diagramas de sequência, modelo ER, RFCs, ADRs).
- Camada PostgreSQL (migrations + repositórios) para os agregados simples
  (Cliente, Veículo, Peça, ItemEstoque, CatalogoServico, Usuário) — ver commit
  correspondente e o relatório do agente que fez o trabalho.

O que seus próprios agentes de código podem continuar fazendo sem você, à medida que
as etapas abaixo destravam pré-requisitos: migração de `OrdemServico`/`Servico`/
`Pagamento` (agregado complexo, deixado por último de propósito), ajustes de aplicação
(logs `pino`, `SesNotificationService`, healthchecks, Swagger), Lambdas e Terraform
(o *código* pode ser escrito sem uma sessão ativa do lab — só o `apply` exige).

---

## Passo 0 — Validação da conta (fazer antes de qualquer Terraform)

1. Abra o AWS Academy Learner Lab, inicie uma sessão e copie o ARN da `LabRole`
   (Console IAM → Roles → `LabRole`). Você vai colar esse ARN em variáveis do
   Terraform em quase todos os módulos.
2. Confirme, criando manualmente um recurso mínimo de teste (ou consultando o console),
   que os seguintes serviços **não estão bloqueados**: EKS, RDS, API Gateway, Lambda em
   VPC, ECR, S3, DynamoDB, SSM Parameter Store.
3. Se o **EKS estiver bloqueado**: plano B é k3s em duas EC2 `t3.small` via Terraform —
   os manifestos de `k8s/` (incluindo o HPA) funcionam igual. Avise para ajustarmos a
   Etapa 3 do plano antes de escrever o Terraform do cluster.
4. Se o **SES estiver bloqueado ou só liberar sandbox**: sem problema, o
   `NodemailerNotificationService` (SMTP externo) fica atrás da mesma port — ver
   `ADR-005`. Só confirme para eu não assumir SES disponível ao implementar a Etapa 4.

Não prossiga para o Passo 1 sem terminar esta validação — descobrir um bloqueio depois
de duas etapas prontas custa muito mais caro que esta checagem.

## Passo 1 — Bootstrap do estado do Terraform (uma vez só)

1. Criar manualmente (console ou CLI, fora de qualquer repositório dos 4): um bucket S3
   versionado para o state e uma tabela DynamoDB para lock.
2. **Estes dois recursos não entram no ciclo `destroy` de fim de sessão** — se forem
   destruídos, o estado do Terraform se perde junto.

## Passo 2 — Criar os 3 repositórios novos no GitHub

1. Criar `soat15-tech-challenge-db-infra`, `soat15-tech-challenge-k8s-infra`,
   `soat15-tech-challenge-auth-lambda` (vazios, com `README.md` e `.gitignore`
   iniciais).
2. Em cada um dos **4 repositórios** (os 3 novos + este):
   - Criar a branch `homolog` a partir de `main`.
   - Proteger `main` e `homolog`: sem push direto, PR obrigatório com ≥1 aprovação,
     status checks de CI obrigatórios, sem force-push.
   - Adicionar `soat-architecture` como colaborador.
   - Capturar screenshot das regras de proteção para o PDF de entrega.
3. Depois de criados, me avise — eu preencho o conteúdo inicial (Terraform, Lambda,
   workflows de CI) de cada um a partir do que já está planejado.

## Passo 3 — Credenciais de CI

1. Gerar `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` da sessão
   ativa do Learner Lab.
2. Publicar como GitHub Secrets nos 4 repositórios. Posso escrever o script
   `scripts/refresh-aws-secrets.sh` (usa `gh secret set`) para automatizar isso a cada
   sessão — é só pedir.
3. **Lembrete operacional**: essas credenciais expiram com a sessão (~4h). Se a
   primeira pipeline do dia falhar com `ExpiredToken`, rode o script de novo e
   re-execute — não é instabilidade da pipeline.

## Passo 4 — `apply` do banco (`db-infra`)

Só depois que o Passo 3 estiver com credenciais válidas e o código Terraform de
`db-infra` estiver escrito (código, eu faço; `apply`, só você/CI com a sessão ativa):

1. `terraform apply` em `db-infra` (workspace/env conforme decidido).
2. Rodar `npm run db:migrate` contra o endpoint do RDS.
3. Rodar `npm run db:seed` — o banco é recriado a cada sessão, então isso vira parte
   do procedimento, não conveniência opcional (sem cliente cadastrado não há CPF para
   a Lambda autenticar na demonstração).

## Passo 5 — `apply` do cluster (`k8s-infra`)

1. `terraform apply` em `k8s-infra` (depende dos outputs de `db-infra` via
   `terraform_remote_state` — precisa rodar depois do Passo 4).
2. Smoke test: `kubectl get nodes`, `kubectl get hpa -n oficina`.

## Passo 6 — `apply` da autenticação (`auth-lambda`)

1. `terraform apply` em `auth-lambda` (depende de `db-infra` e `k8s-infra`).
2. Teste de fumaça: invocar a Lambda com um CPF de fixture cadastrado no seed do
   Passo 4.

## Passo 7 — Deploy da aplicação

1. Pipeline do repositório da aplicação builda a imagem, publica no ECR, roda o `Job`
   de migration e faz `kubectl set image` + `rollout status`.
2. Fluxo fim a fim: `POST /auth/token` com CPF de cliente cadastrado → JWT → chamada
   protegida via API Gateway → `200`.

## Passo 8 — Observabilidade

1. Criar conta New Relic (free tier).
2. Me passar a license key (via GitHub Secret, não em texto direto) para eu ligar o
   agente APM e o `nri-bundle`.
3. Validar os 4 dashboards exigidos e disparar um erro proposital num use-case de
   transição de status para confirmar que o alerta correspondente dispara.

## Passo 9 — Disciplina de custo (repetir a cada sessão)

1. Início da sessão: `terraform apply` na ordem dos Passos 4→5→6 (ou script único que
   os encadeie).
2. Fim da sessão: `terraform destroy` na ordem inversa (`auth-lambda` → `k8s-infra` →
   `db-infra`), preservando bucket S3/DynamoDB do Passo 1.
3. Gravar o vídeo de demonstração (até 15 min) numa sessão com a infra recém-aplicada,
   não numa sessão antiga.

## Passo 10 — Entregáveis finais

1. README de cada um dos 4 repositórios com diagrama próprio, tecnologias, passos de
   execução/deploy.
2. Links dos deploys ativos (endpoint do API Gateway, dashboard New Relic).
3. Vídeo (roteiro sugerido em `PHASE_3_PLAN.md`, Etapa 7).
4. PDF único no Portal do Aluno: links dos 4 repositórios, vídeo, documentações,
   confirmação de `soat-architecture` como colaborador nos 4.

---

## Onde me chamar de novo

- Depois do **Passo 0**: se algum serviço estiver bloqueado, para ajustarmos o plano
  antes de eu escrever Terraform para um serviço inexistente.
- Depois do **Passo 2**: para eu popular os 3 repositórios novos com o código já
  planejado (Terraform, Lambda, workflows).
- A qualquer momento, para eu continuar a migração de código que não depende de conta
  nenhuma: `OrdemServico`/`Servico`/`Pagamento` no Postgres, ajustes de aplicação
  (Etapa 4), Terraform e Lambda (código, não `apply`).
