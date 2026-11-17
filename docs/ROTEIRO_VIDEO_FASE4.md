# Roteiro do vídeo da Fase 4 (≤ 15 min)

O enunciado pede quatro demonstrações: **(1)** fluxo completo de uma OS pelos microsserviços, **(2)** Saga e
tratamento de falhas, **(3)** deploy automatizado com validação de testes e **(4)** monitoramento e rastreamento
distribuídos. Este roteiro cobre as quatro em **14 min** (1 min de folga), mais a abertura de arquitetura e uma
demonstração de resiliência.

| Bloco | Conteúdo | Tempo | Acumulado |
|---|---|---|---|
| 1 | Arquitetura e por que Saga orquestrada | 1:30 | 1:30 |
| 2 | Fluxo completo de uma OS (feliz, com Mercado Pago) | 3:30 | 5:00 |
| 3 | Saga com falhas: recusa de pagamento e falha no reparo (estorno) | 3:00 | 8:00 |
| 4 | Resiliência: Billing fora do ar, mensagens esperam na fila | 1:00 | 9:00 |
| 5 | Deploy automatizado: PR → checks → merge → EKS | 2:30 | 11:30 |
| 6 | Monitoramento e rastreamento distribuído | 2:30 | 14:00 |

Dica de edição: grave cada bloco separado e junte depois. O bloco 5 é o único que tem espera real (CI e deploy,
~7 min); grave os dois primeiros minutos ao vivo e **corte** a espera, mostrando o resultado.

---

## Antes de gravar (não entra no tempo)

**Janela do Learner Lab.** Sessão de 4 h. Faça o ensaio e a gravação **na mesma sessão** e, se ela expirou, rode
`./scripts/refresh-aws-secrets.sh` (ou recrie os secrets `AWS_*` nos 6 repos) antes de qualquer push.

**Infra no ar** (conferir): EKS `soat15-tc-cluster`, RDS `soat15-tc-homolog-db`, 3 serviços e o API Gateway.

```bash
export GW=https://1meh3wq1p3.execute-api.us-east-1.amazonaws.com   # troque se o gateway for recriado
curl -s $GW/health/ready | jq        # UP + database CONNECTED
aws eks update-kubeconfig --name soat15-tc-cluster --region us-east-1
kubectl get pods -n oficina-homolog  # os 3 serviços Running
```

**Mercado Pago (sandbox).**
- Use uma **janela anônima** (ou outro perfil do navegador), logada só como a **compradora de teste**. Se o
  navegador estiver logado na conta real, o Checkout dá *"Uma das partes com as quais você está tentando efetuar o
  pagamento é de teste"*.
- Cartão de teste do painel. Titular **`APRO`** = aprova; **`OTHE`** = recusa.
- O link do Checkout (`initPoint`) vale **1 hora** depois de gerado.

**Abas abertas, nesta ordem:**
1. Diagrama de arquitetura (README do OS, seção *Arquitetura*, ou `docs/architecture/component-diagram.md`).
2. Swagger do OS: `$GW/api/docs`.
3. Painel do Mercado Pago de teste (Atividade do vendedor, para ver o estorno).
4. GitHub: repo do Billing (para o PR do bloco 5) e a aba Actions.
5. New Relic: dashboard **"Oficina — Saga / Microsserviços"**, APM → Distributed tracing, Logs e Alerts.
6. SonarQube local: http://localhost:9000 (ver bloco 5).

**Terminais:** um para os `curl`, um para `kubectl`. Cole **uma vez** estas funções no terminal dos `curl`:

```bash
TOKEN=$(curl -s $GW/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@oficina.com","senha":"senha123"}' | jq -r '.token')
AUTH="Authorization: Bearer $TOKEN"
api() { curl -fsS -X "$1" -H "$AUTH" -H 'content-type: application/json' ${3:+-d "$3"} "$2"; }
espera() { # url filtro-jq : repete até o valor existir (as mensagens da Saga são assíncronas)
  for _ in $(seq 1 60); do o=$(curl -fsS -H "$AUTH" "$1" | jq -r "$2" 2>/dev/null); \
    [ -n "$o" ] && [ "$o" != null ] && { echo "$o"; return; }; sleep 2; done; echo "timeout" >&2; }
CPF=52998224725; PLACA=SMK1A23
```

**Dados do ensaio.** O cliente `CPF 52998224725` e o veículo `SMK1A23` já existem (criados no ensaio da Fase 4) e o
catálogo tem o serviço "Revisão (Passo 7)". Se o ambiente foi recriado, repita o cadastro de
`scripts/smoke-fluxo-feliz.sh` (passo "Cadastros").

**Passada seca obrigatória.** Rode os blocos 2, 3 e 4 uma vez inteiros antes de gravar. Itens que **ainda não foram
exercitados na AWS** e precisam de confirmação no ensaio: `reparo/falhar` com estorno no painel do Mercado Pago
(bloco 3b) e o `POST /auth/token` com o CPF do cliente de teste (bloco 2).

---

## Bloco 1 — Arquitetura e Saga (0:00–1:30)

**Mostre:** o diagrama de componentes (`docs/architecture/component-diagram.md`, versão Fase 4).

**Fale (resumo):**
- "Dividi o monolito em **três microsserviços**: **OS Service** (cadastros, ordens e o **orquestrador da Saga**),
  **Billing Service** (orçamento e pagamento com Mercado Pago) e **Execution Service** (fila de diagnóstico e reparo
  da oficina)."
- "**Cada serviço tem o seu banco**: OS e Billing em PostgreSQL (RDS, databases e roles separados) porque são
  relacionais e transacionais. A Execution usa **DynamoDB**, porque o acesso é por chave (fila por status e busca por
  OS) e a escrita é condicional por versão."
- "Comunicação: **SQS para comandos** (cada serviço tem a sua fila, com DLQ) e **SNS para eventos** (tópico
  `oficina-eventos`). Em cada serviço, **outbox e inbox transacionais** garantem que a mensagem só sai se o dado foi
  gravado e que uma reentrega não duplica o efeito."
- "A entrada é o **API Gateway**, com um **Lambda authorizer** (JWT) e o Lambda de token por CPF, e um **VPC Link**
  para o ALB interno do EKS."
- "**Saga orquestrada**: o OS Service sabe o caminho (diagnóstico, estoque, orçamento, aprovação, pagamento, reparo,
  finalização) e, se algo falha, comanda as **compensações em ordem reversa**. Escolhi orquestração e não coreografia
  porque o fluxo tem ordem rígida e compensações dependentes; com a coreografia ninguém enxerga o processo inteiro."

**Mostre rápido:** `docs/architecture/sequence-saga-compensacao.md` (diagrama de sequência com compensação).

---

## Bloco 2 — Fluxo completo de uma OS (1:30–5:00)

**Objetivo:** uma OS passa pelos três serviços, do cadastro ao `FINALIZADA`, com pagamento real no Mercado Pago de
teste.

**2.1 — Abrir a OS** (OS Service) — `0:40`
```bash
OS_ID=$(api POST $GW/api/ordens-servico "{\"cpfCnpj\":\"$CPF\",\"placa\":\"$PLACA\",\"quilometragemEntrada\":1000}" | jq -r '.id // .data.id'); echo $OS_ID
```
Fale: "A OS nasce `RECEBIDA` e o OS Service **inicia a Saga** e envia o comando de diagnóstico ao Execution." Mostre
`api GET $GW/api/ordens-servico/$OS_ID/historico | jq '.saga'` (saga `EM_ANDAMENTO`, passo `DIAGNOSTICO`).

**2.2 — Execution: o mecânico** — `0:50`
```bash
EXEC_ID=$(espera "$GW/api/execucoes/fila?status=AGUARDANDO_DIAGNOSTICO&limit=100" "[.data[]|select(.ordemServicoId==\"$OS_ID\")][0].id")
api PATCH $GW/api/execucoes/$EXEC_ID/diagnostico/iniciar >/dev/null
SERVICO_ID=$(api GET "$GW/api/servicos" | jq -r '(.data // .servicos // .)[0].id')
api PATCH $GW/api/execucoes/$EXEC_ID/diagnostico/concluir "{\"servicos\":[{\"catalogoServicoId\":\"$SERVICO_ID\",\"pecas\":[]}],\"observacoes\":\"demo\"}" >/dev/null
```
Fale: "A execução entrou **na fila do Execution Service**; o mecânico inicia e conclui o diagnóstico."

**2.3 — Billing: orçamento e aprovação** — `0:40`
```bash
ORC_ID=$(espera "$GW/api/orcamentos?ordemServicoId=$OS_ID" '.data.id'); echo $ORC_ID
api POST $GW/api/orcamentos/$ORC_ID/aprovar >/dev/null
espera "$GW/api/orcamentos/$ORC_ID" '.data.pagamento.initPoint'
```
Fale: "O diagnóstico concluído gerou o **orçamento no Billing**; ao aprová-lo, o Billing cria a **preferência do
Checkout Pro** e devolve o link." Opcional (15 s): mostrar o **token por CPF**:
`curl -s $GW/auth/token -H 'content-type: application/json' -d "{\"cpf\":\"$CPF\"}" | jq` (Lambda → OS Service).

**2.4 — Pagamento no Mercado Pago** — `0:50`
Abra o `initPoint` na **janela anônima**, logada como a compradora de teste, pague com titular `APRO`.
Fale: "O Mercado Pago confirma o pagamento e chama o **webhook pelo API Gateway**; o Billing **valida a assinatura
HMAC** e **nunca confia no corpo**: reconsulta o pagamento na API do Mercado Pago antes de confirmar."
Mostre (rápido): `curl -s -X POST $GW/api/pagamentos/webhooks/mercadopago -d '{}' -H 'content-type: application/json'`
→ **401 "Assinatura do webhook inválida"**.

**2.5 — Reparo e fim** — `0:30`
```bash
espera "$GW/api/execucoes/fila?status=AGUARDANDO_REPARO&limit=100" "[.data[]|select(.id==\"$EXEC_ID\")][0].id" >/dev/null
api PATCH $GW/api/execucoes/$EXEC_ID/reparo/iniciar >/dev/null
api PATCH $GW/api/execucoes/$EXEC_ID/reparo/concluir '{"observacoes":"demo ok"}' >/dev/null
api GET $GW/api/ordens-servico/$OS_ID/historico | jq -c '{statusAtual, transicoes:[.status[].para], saga:.saga.status, passos:[.saga.passos[].acao]}'
api GET $GW/api/relatorios/dashboard | jq -c '.financeiro'
```
**Mostre:** `FINALIZADA`, saga `CONCLUIDA` com os 10 passos e a `receitaTotal` no dashboard (o dado vem do Billing).

---

## Bloco 3 — Saga com falhas e compensação (5:00–8:00)

Repita 2.1–2.3 numa **OS nova** (cole os comandos; a espera de uma OS pronta para pagar leva ~10 s). Para não perder
tempo, deixe **duas OS já com o `initPoint` gerado** antes de gravar (uma para 3a e outra para 3b).

**3a — Pagamento recusado (`OTHE`)** — `1:15`
Pague a OS A com titular **`OTHE`**.
```bash
espera "$GW/api/orcamentos/$ORC_ID" 'select(.data.pagamento.status!="PENDENTE")|.data.pagamento.status'   # RECUSADO
api GET $GW/api/ordens-servico/$OS_ID/historico | jq -c '{statusAtual, motivo:[.status[]|select(.motivo)|.motivo], saga:.saga.status, passos:[.saga.passos[]|.acao+":"+.resultado]}'
```
**Mostre:** saga `COMPENSADA`; passos `PagamentoRecusado:FALHA → IniciarCompensacao → CancelarOrcamento →
CancelarExecucao → OSCancelada`; OS `CANCELADA` com o motivo `rejected: cc_rejected_other_reason`.
Fale: "A compensação **desfaz o que já foi feito, em ordem reversa**: cancela o orçamento, cancela a execução,
cancela a OS."

**3b — Falha no reparo depois de pago → estorno** — `1:45`
Pague a OS B com `APRO` (deixe `EM_EXECUCAO`), depois:
```bash
api PATCH $GW/api/execucoes/$EXEC_ID/reparo/iniciar >/dev/null
api PATCH $GW/api/execucoes/$EXEC_ID/reparo/falhar '{"motivo":"peça indisponível"}'   # confirme o corpo exigido no Swagger
espera "$GW/api/ordens-servico/$OS_ID" 'select(.data.status=="CANCELADA")|.data.status'
api GET $GW/api/ordens-servico/$OS_ID/historico | jq -c '{saga:.saga.status, passos:[.saga.passos[]|.acao+":"+.resultado]}'
```
**Mostre:** `EstornarPagamento` na saga e, no **painel do Mercado Pago**, o pagamento como **reembolsado**.
Fale: "Aqui a compensação é a mais cara: **o dinheiro já tinha entrado**, então o Billing **estorna** no Mercado
Pago com chave de idempotência. Se o estorno falhar, a saga vai para `FALHA_COMPENSACAO` e dispara um alerta de
intervenção manual."

*(Se o 3b não puder ser ensaiado, mostre só o 3a e use o diagrama `sequence-saga-compensacao.md` para o estorno,
dizendo que está coberto por BDD e testes de contrato.)*

---

## Bloco 4 — Resiliência: Billing fora do ar (8:00–9:00)

**Fale:** "As mensagens ficam na fila: se um serviço cai, a Saga **espera** em vez de falhar."

```bash
# terminal kubectl
kubectl scale deployment/billing-service -n oficina-homolog --replicas=0
```
No terminal dos `curl`: crie uma OS, conclua o diagnóstico (2.1–2.2). O orçamento **não aparece** (o Billing está parado).
Mostre a fila acumulando:
```bash
Q=$(aws sqs list-queues --queue-name-prefix soat15-tc-homolog --query 'QueueUrls[?contains(@,`billing-commands`) && !contains(@,`dlq`)]|[0]' --output text)
aws sqs get-queue-attributes --queue-url $Q --attribute-names ApproximateNumberOfMessages --query Attributes
kubectl scale deployment/billing-service -n oficina-homolog --replicas=1
```
Quando o pod subir (~30 s, corte), o orçamento aparece e a saga **continua de onde parou**:
`espera "$GW/api/orcamentos?ordemServicoId=$OS_ID" '.data.id'`.

---

## Bloco 5 — Deploy automatizado (9:00–11:30)

**Fale:** "Cada serviço tem **a sua pipeline**. Em PR roda tudo menos o deploy; no merge em `homolog` ela publica a
imagem no ECR e faz o deploy no EKS."

**Preparação (fora do vídeo):** rode `./scripts/sonar-local.sh` no repo do OS ~10 min antes e deixe o painel do SonarQube
aberto. A análise do Sonar é **local** (o CI mostra o job `Sonar` passando com um aviso); explique isso em uma frase.

1. No repo do **Billing**, crie uma branch com uma mudança pequena e visível (ex.: uma linha no README) e abra o PR
   para `homolog`. *(Mostre o PR aberto.)*
2. Aba **Actions** → checks do PR: **Build** (tipos, lint), **Test** (Postgres + LocalStack, cobertura mínima 80 %),
   **Sonar**, **Terraform (fmt + validate)** e **Terraform plan**. Mostre o resumo de cobertura e o relatório BDD no
   `GITHUB_STEP_SUMMARY`.
3. Mostre o **painel do SonarQube local**: quality gate **Passed** e cobertura dos 3 serviços.
4. **Merge** em `homolog`. Mostre o pipeline de push: Terraform (ECR, fila) → **Build & Push (ECR)** → **Deploy (EKS)**
   (**corte a espera**, ~6 min).
5. Prova do deploy: `kubectl get pods -n oficina-homolog` (pod novo, `AGE` baixo) e
   `kubectl rollout history deployment/billing-service -n oficina-homolog`.

**Se a branch protection estiver ativa** (`./scripts/protect-branches.sh`), mostre que o merge só libera com `Build`,
`Test` e `Sonar` verdes. **Não aplique o script** antes de ver esses três checks verdes pelo menos uma vez.

---

## Bloco 6 — Monitoramento e rastreamento (11:30–14:00)

Use a **OS do bloco 2** (ou a do bloco 3) para ter dados recentes; `export SAGA_ID=$(api GET $GW/api/ordens-servico/$OS_ID/historico | jq -r .saga.id)`.

1. **Trace distribuído** — `0:50`. New Relic → APM → **Distributed tracing**; filtre pelo serviço
   `oficina-api-homolog`, abra um trace do fluxo (OS → Billing → OS). Fale: "O `traceparent` viaja **no envelope da
   mensagem** pelo SQS/SNS; por isso um trace atravessa as filas."
2. **Logs por `sagaId`** — `0:40`. New Relic → Logs: `sagaId:"<SAGA_ID>"`. Mostre logs dos **três serviços** da mesma
   saga (cada linha tem `sagaId` e `correlationId`).
3. **Dashboard da Saga** — `0:50`. **"Oficina — Saga / Microsserviços"**: sagas iniciadas e concluídas, taxa de
   compensação, passos por resultado (`SagaPassoExecutado`) e a **profundidade das filas** (`FilaProfundidade`).
4. **Alertas** — `0:20`. Alerts: *Saga em FALHA_COMPENSACAO (intervenção manual)*, *Mensagem em DLQ*, *Taxa de
   compensação das sagas acima de 50%* e *Erro no webhook do Mercado Pago*. Fale: "Uma mensagem na DLQ ou uma saga
   que não consegue compensar **chama um humano**."

**Fecho (15 s):** "Três microsserviços, Saga orquestrada com compensação, deploy automatizado e rastreamento ponta a
ponta. Links dos repositórios e o diagrama estão no PDF."

---

## Checklist de gravação

- [ ] Sessão do Learner Lab ativa e infra no ar (`kubectl get pods`, `health/ready`).
- [ ] `AWS_*` atualizados nos secrets dos 6 repos (se o lab foi reiniciado).
- [ ] Passada seca dos blocos 2, 3 e 4 feita **na mesma sessão**.
- [ ] Janela anônima logada como a compradora de teste; cartões `APRO` e `OTHE` à mão.
- [ ] Duas OS com `initPoint` gerado (blocos 3a e 3b) e o `SAGA_ID` de uma OS finalizada.
- [ ] SonarQube local com a análise recente; abas do New Relic abertas.
- [ ] Gravação em 1080p, fonte do terminal grande (≥ 16 pt), notificações desligadas.
- [ ] Upload no YouTube como **não listado** e link no PDF (Passo 9 do guia).

## Plano B (se algo falhar durante a gravação)

| Problema | O que fazer |
|---|---|
| Webhook não chega / pagamento fica `PENDENTE` | Mostre que o pagamento está `approved` no painel do MP e use a **reconciliação** do Billing (`POST /internal/pagamentos/:id/sincronizar`, dentro do cluster: `kubectl exec`). Explique que ela existe justamente para isso. |
| Checkout: "uma das partes é de teste" | Janela anônima e login da compradora de teste (não a conta real). |
| `initPoint` expirado (1 h) | Gere uma OS nova; é só repetir 2.1–2.3. |
| Pipeline do bloco 5 demora ou falha | Mostre um run **já concluído** em `homolog` (Actions) e o `rollout history`; comente que a pipeline é idêntica. |
| `ExpiredToken` no CI | Renove os secrets `AWS_*` e reexecute o job. |
