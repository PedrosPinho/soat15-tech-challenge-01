# Guia de Execução — Fase 4

Checklist prático, em ordem, das partes da Fase 4 que exigem **acesso a contas
externas** (AWS Academy Learner Lab, GitHub, Mercado Pago, SonarCloud, New
Relic) e que, por isso, um agente de código não consegue fazer sozinho. O
"porquê" de cada decisão está em [`PHASE_4_PLAN.md`](PHASE_4_PLAN.md); o
checklist de código está em [`PHASE_4_TASKS.md`](PHASE_4_TASKS.md) (tasks
marcadas com **[👤]** remetem a este guia).

O que **já está pronto da Fase 3** e é reaproveitado: bucket S3 + DynamoDB de
estado do Terraform, os 4 repos com branch protection, `LabRole`, conta New
Relic com license key nos secrets, workflows `destroy.yml` nos repos de infra,
`scripts/refresh-aws-secrets.sh`.

---

## Passo 0 — Validação do Learner Lab (antes de qualquer Terraform novo)

Numa sessão ativa, no console ou CLI (`us-east-1`):

1. **SQS**: criar uma fila `teste-fase4` → enviar e receber uma mensagem → apagar.
2. **SNS**: criar tópico `teste-fase4`, assinar a fila do item 1 com *filter
   policy* `{"type":["Teste"]}`, publicar com `MessageAttributes type=Teste` e
   conferir que chegou na fila → apagar.
3. **DynamoDB**: criar tabela on-demand `teste-fase4` (PK `pk` string) → `put-item` → apagar.
4. **EC2/EKS**: confirmar que `t3.medium` é permitido (lançar e terminar uma
   instância avulsa basta).
5. **Do pod** (com o cluster aplicado):
   ```bash
   kubectl run awscli --rm -it --image=amazon/aws-cli --command -- \
     sh -c 'aws sqs list-queues --region us-east-1 && aws dynamodb list-tables --region us-east-1'
   ```
   Tem que responder sem `AccessDenied`/`no EC2 IMDS role found`.

Anote aqui o resultado. **Se algo falhar, me avise antes de começar a Etapa 2**:
SQS/SNS bloqueados → RabbitMQ no cluster; DynamoDB bloqueado → MongoDB no
cluster; `t3.medium` bloqueado → `t3.small` + prefix delegation. Os três
planos B ficam atrás das mesmas ports, mas mudam Terraform e manifestos.

| Item | Resultado |
|---|---|
| SQS | ☐ |
| SNS + filter policy | ☐ |
| DynamoDB | ☐ |
| `t3.medium` | ☐ |
| Pod → SQS/DynamoDB via `LabRole` | ☐ |

## Passo 1 — Repositórios novos no GitHub

1. Os dois repositórios **já existem localmente** em `/home/pedropinho/soat/`
   (commit inicial, `main` + `homolog`, git user/email locais já configurados).
   Falta criar os remotos **públicos** (o SonarCloud gratuito exige repos públicos)
   e publicar — **sem** README/licença/.gitignore gerados pelo GitHub, para o push não conflitar:
   ```bash
   cd /home/pedropinho/soat/soat15-tech-challenge-billing-service
   gh repo create PedrosPinho/soat15-tech-challenge-billing-service --public --source=. --remote=origin
   git push -u origin main homolog

   cd ../soat15-tech-challenge-execution-service
   gh repo create PedrosPinho/soat15-tech-challenge-execution-service --public --source=. --remote=origin
   git push -u origin main homolog
   ```
   (ou crie pela interface do GitHub e use `git remote add origin … && git push -u origin main homolog`.)
2. Branch padrão do repositório = `main`. O primeiro push já dispara o CI (`Build`/`Test`), necessário para os checks aparecerem na proteção (Passo 6).
3. Adicionar `soat-architecture` como colaborador (write) nos 2.
4. Branch protection em `main`/`homolog`: **depois** do primeiro run do CI
   (Passo 6) — o GitHub só deixa marcar um check como obrigatório depois que ele
   rodou pelo menos uma vez.

## Passo 2 — Mercado Pago (sandbox)

1. Criar conta em <https://www.mercadopago.com.br/developers> → **Suas
   integrações** → **Criar aplicação** (produto: *Checkout Pro*, pagamentos online).
2. Em **Credenciais de teste**, copiar o *Access Token* de teste (`TEST-...`).
3. **Contas de teste**: criar um usuário **vendedor** e um **comprador**. Os
   pagamentos do vídeo são feitos logado como o comprador de teste.
4. **Webhooks** (na aplicação): eventos `payment`. A URL fica para depois do
   primeiro deploy com o API Gateway:
   `https://<api-id>.execute-api.us-east-1.amazonaws.com/api/pagamentos/webhooks/mercadopago`.
   Copiar a **assinatura secreta** gerada.
5. Publicar os dois valores, **sem colar em chat/arquivo**:
   ```bash
   aws ssm put-parameter --name /soat15-tc/homolog/billing/mp-access-token \
     --type SecureString --value 'TEST-...' --overwrite
   aws ssm put-parameter --name /soat15-tc/homolog/billing/mp-webhook-secret \
     --type SecureString --value '...' --overwrite
   ```
   > Os parâmetros SSM somem se a conta do lab for resetada, mas **não** no
   > `destroy` de fim de sessão, porque não são gerenciados pelo Terraform do serviço (o
   > Terraform só lê). Guarde os valores num gerenciador de senhas.
6. Cartões de teste: usar os do painel (Mastercard/Visa de teste); **titular
   `APRO`** = aprovado, **`OTHE`** = recusado (é assim que se demonstra a falha
   de pagamento no vídeo).

## Passo 3 — SonarCloud

1. Entrar em <https://sonarcloud.io> com o GitHub, importar a organização `PedrosPinho`.
2. Criar 3 projetos (analysis method: **GitHub Actions**, não *Automatic
   Analysis*, porque a cobertura vem do `lcov` gerado no CI):
   `soat15-tech-challenge-01`, `...-billing-service`, `...-execution-service`.
3. Gerar um token (My Account → Security) e salvar como secret `SONAR_TOKEN`
   em cada um dos 3 repos de serviço:
   ```bash
   for r in soat15-tech-challenge-01 soat15-tech-challenge-billing-service soat15-tech-challenge-execution-service; do
     gh secret set SONAR_TOKEN -R PedrosPinho/$r
   done
   ```
4. Quality gate: manter o padrão *Sonar way*, ajustando "Coverage on New
   Code" para **80%**.
5. Me passar a `organization key` e as `project keys` (não são segredo) para
   eu preencher os `sonar-project.properties`.

## Passo 4 — Secrets e credenciais de CI

1. A cada sessão do lab: `./scripts/refresh-aws-secrets.sh` (depois da T0.6, já
   publica nos 6 repos).
2. Uma vez só, nos repos novos:
   - `NEW_RELIC_LICENSE_KEY` (mesma da Fase 3) nos 2 serviços novos.
   - `WEBHOOK_SECRET` no **Billing** (a aprovação externa de orçamento migra do OS para lá).
3. `INTERNAL_API_TOKEN`: gerado pelo Terraform do OS Service no SSM e lido pelos
   pipelines, então não precisa de ação manual.

## Passo 5 — Primeira subida na AWS (`homolog`), em ordem

Pré-requisito: Passo 0 ok, credenciais renovadas.

1. `db-infra` → apply (roles/senhas novas no SSM).
2. `k8s-infra` → apply (node group `t3.medium`: **troca os nós**, leva ~10 min).
3. **OS Service** → pipeline (cria SNS `oficina-eventos` e `os-saga-replies`; bootstrap de banco; migrations; Ingress → cria o ALB).
4. **Execution** e **Billing** → pipelines (em qualquer ordem; o Ingress deles entra no mesmo ALB).
5. `auth-lambda` → apply (VPC Link agora aponta para o ALB; rota pública do webhook do MP).
6. Cadastrar a URL do webhook no painel do Mercado Pago (Passo 2.4) com o endpoint do API Gateway.
7. Smoke manual: `GET /health/ready` público, `POST /auth/token` com o CPF do seed.

Se algo falhar, me mande o log do job. Na Fase 3, todos os bugs da primeira
execução real só apareceram contra a AWS (ver "Execução real" em
`PHASE_3_TASKS.md`), e deve se repetir aqui.

## Passo 6 — Branch protection (depois do primeiro run verde)

Nos 2 repos novos, e atualizando o OS Service:

- `main` e `homolog`: PR obrigatório, sem push direto, sem force-push, `enforce_admins`.
- **Required status checks**: `Build`, `Test`, `SonarCloud` (nomes exatos dos jobs).
- Tirar print das regras de cada repo para o PDF.

## Passo 7 — Ensaio do fluxo completo (antes de gravar)

Com a collection Postman da Fase 4 (T9.4), na ordem:

1. Login interno → abrir OS (cliente/veículo do seed) → conferir `RECEBIDA` e saga `EM_ANDAMENTO`.
2. Mecânico: `diagnostico/iniciar` → `diagnostico/concluir` com itens → OS `AGUARDANDO_APROVACAO`, e-mail do orçamento.
3. Cliente: `POST /auth/token` (CPF) → `aprovar` → OS `AGUARDANDO_PAGAMENTO`, `initPoint` no orçamento.
4. Abrir o `initPoint` logado como **comprador de teste**, pagar com titular `APRO` → webhook → OS `EM_EXECUCAO`.
5. Mecânico: `reparo/iniciar` → `reparo/concluir` → OS `FINALIZADA`; `GET /:id/historico` mostra todos os passos.
6. Repetir com: titular `OTHE` (pagamento recusado), `recusar` (orçamento recusado), `reparo/falhar` (estorno visível no painel do MP).
7. No New Relic: abrir o trace distribuído de uma OS e o dashboard de Saga.

## Passo 8 — Vídeo (≤ 15 min), roteiro sugerido

| Bloco | Conteúdo | Tempo |
|---|---|---|
| 1 | Arquitetura: diagrama geral (3 serviços, bancos SQL/NoSQL, SQS/SNS, API Gateway), por que Saga orquestrada | 2 min |
| 2 | **Fluxo completo de uma OS** pelos 3 serviços (Passo 7, itens 1–5), mostrando a fila do Execution, o orçamento no Billing e o checkout do MP | 4 min |
| 3 | **Saga com falhas**: reparo falha → estorno no painel do MP + OS `CANCELADA` + histórico de compensação; pagamento recusado (`OTHE`) | 3 min |
| 4 | Resiliência: Billing escalado para 0 → mensagens acumulam na fila → volta → saga continua | 1 min |
| 5 | **Deploy automatizado**: PR num serviço → checks (build, test, cobertura, SonarCloud) → merge em `homolog` → deploy no EKS | 3 min |
| 6 | **Monitoramento e rastreamento**: trace distribuído OS → Billing → OS, logs filtrados por `sagaId`, dashboard de Saga, alerta de DLQ | 2 min |

Gravar numa sessão do lab recém-aplicada, com o fluxo ensaiado **na mesma
sessão** (credenciais de 4h). Upload no YouTube como **não listado**.

## Passo 9 — PDF do portal

Conteúdo exigido pelo enunciado:

1. Nome e identificação dos participantes (RM).
2. Links dos repositórios: os 3 serviços + `db-infra`, `k8s-infra`, `auth-lambda`.
3. Link do vídeo.
4. Diagrama geral da arquitetura final (exportar o Mermaid do `component-diagram.md` como imagem).
5. Estratégia de Saga (orquestrada): resumo do `ADR-009` + diagrama de sequência com compensação.
6. Justificativa da divisão dos microsserviços e das tecnologias (resumo de `RFC-005`, `ADR-008`, `ADR-010`, `ADR-011`, `ADR-014`).
7. Extras que valem nota: prints da branch protection, do quality gate e da cobertura de cada serviço.

## Passo 10 — Disciplina de custo (a cada sessão)

- Início: refresh de secrets → apply na ordem do Passo 5.
- Fim: `destroy` na ordem inversa: `auth-lambda` → Billing/Execution/OS
  (`destroy.yml` de cada serviço) → `k8s-infra` → `db-infra`. Preservar bucket S3/DynamoDB de estado e os parâmetros SSM do Mercado Pago.
- Conferir ENIs/ALB órfãos no console EC2 depois do destroy (o ALB é criado pelo
  LB Controller, não pelo Terraform: apagar os Ingress **antes** de destruir o cluster).

---

## Onde me chamar de novo

- **Depois do Passo 0**: com a tabela preenchida, para eu confirmar ou trocar os planos B antes da Etapa 2.
- **Depois dos Passos 2 e 3**: com as *keys* do SonarCloud (não os tokens) e a confirmação de que os parâmetros SSM do MP existem.
- **A cada pipeline vermelho na primeira subida** (Passo 5): com o log do job.
- **Antes de gravar**: se algum item do ensaio (Passo 7) não se comportar como descrito.
