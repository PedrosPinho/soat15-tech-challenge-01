# Roteiro do vídeo de demonstração (≤15min)

> Estrutura exigida pelo PDF do desafio (`docs/13SOAT - Fase 3 - Tech Challenge.pdf`):
> 6 blocos, 15 minutos no total. Este roteiro detalha o que mostrar, o que falar e
> os comandos exatos de cada bloco, para gravar com o mínimo de retrabalho/corte.

## Antes de gravar (preparação, não entra no tempo do vídeo)

1. **Sessão do Learner Lab ativa** e infra aplicada — rodar
   `scripts/refresh-aws-secrets.sh` se a última sessão já tiver expirado, e
   confirmar que os 4 pipelines estão verdes (`gh run list` em cada repo).
2. **Abas do navegador já abertas**, nesta ordem (facilita alternar sem
   procurar durante a gravação):
   - GitHub: este repositório, aba **Actions**
   - GitHub: o repositório onde o PR de demonstração vai ser aberto (sugestão:
     este mesmo repo, `soat15-tech-challenge-01`)
   - New Relic → **Dashboards** (as 4 telas: Volume diário de OS, Tempo médio
     por status, Erros e falhas nas integrações, Latência e recursos do cluster)
   - New Relic → **Alerts & AI** → política "Oficina — Fase 3"
   - New Relic → **Logs** (para o bloco 6)
3. **Terminal com 3 painéis/abas**: um para comandos `curl`, um para
   `kubectl get hpa -n oficina-homolog -w` (fica rodando o vídeo todo a partir
   do bloco 5), um para `kubectl logs`.
4. Exportar o endpoint uma vez, reaproveitado em todos os blocos:
   ```bash
   export ENDPOINT=https://8vp6dbqs8g.execute-api.us-east-1.amazonaws.com
   ```
5. Ter o `jq` instalado (formata as respostas JSON na tela) — `brew install jq`
   ou `apt install jq`.
6. Fazer **uma passada seca (dry run)** de todos os comandos antes de gravar,
   principalmente o bloco 4 (criação de OS), para confirmar que o cliente
   semeado (`db:seed`) já existe e os IDs que os comandos capturam via `jq`
   estão vindo certos.

---

## Bloco 1 — Autenticação com CPF via API Gateway (0:00–2:00)

**Fala de abertura (10–15s)**: nome do projeto, "Fase 3 do Tech Challenge —
migração para nuvem, autenticação serverless e observabilidade", os 4
repositórios (app, db-infra, k8s-infra, auth-lambda).

**Mostrar na tela**: seção "🚀 Deploy ao vivo" do `README.md` deste repositório
— o endpoint público é real, não `localhost`.

**Terminal:**

```bash
curl -s -X POST "$ENDPOINT/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"cpf":"52998224725"}' | jq
```

**Falar enquanto roda**: essa chamada não toca a aplicação principal — vai
direto ao API Gateway do repositório `auth-lambda`, que aciona uma **Function
Serverless** (Lambda) que valida os dígitos verificadores do CPF, consulta o
cliente no RDS e devolve um JWT com `scope: cliente`.

**Mostrar o token decodificado** (opcional, ~15s): colar o token em jwt.io ou
rodar `echo $TOKEN | cut -d. -f2 | base64 -d | jq` — apontar o campo
`scope: "cliente"` e o `clienteId`.

**Contraste rápido (15s)**: repetir a chamada com um CPF inválido
(`{"cpf":"11111111111"}`) → `400`, e com um CPF bem-formado mas não cadastrado
(`{"cpf":"12345678909"}`) → `404`. Mostra a Lambda validando de verdade, não
só um mock.

---

## Bloco 2 — Pipeline de CI/CD a partir de um PR (2:00–5:00)

**Preparar um commit pequeno e real** (não precisa ser código — um ajuste de
comentário ou de texto no README já serve, o importante é ser um PR de
verdade criado ao vivo):

```bash
git checkout homolog && git pull origin homolog
git checkout -b demo/video-fase3
# edite algo pequeno e visível, ex.: um comentário em algum arquivo
git add -A
git commit -m "docs: ajuste para demonstração em vídeo"
git push -u origin demo/video-fase3
```

**Abrir o PR pela UI do GitHub** (mais visual para o vídeo do que `gh pr
create`) contra `homolog`.

**Falar enquanto o PR abre**: os 4 repositórios têm `main`/`homolog`
protegidas — push direto é rejeitado, todo merge nasce de um Pull Request
(mostrar a mensagem de branch protegida se tentar simular um push direto, ou
apenas citar).

**Mostrar a aba Checks do PR rodando ao vivo**: build → type-check → testes
com Testcontainers. Se o repo escolhido for um dos de infraestrutura em vez
do app, mostrar também o comentário automático do `terraform plan` que o
pipeline posta no PR.

**Fazer o merge pela UI** (botão "Merge pull request") assim que os checks
ficarem verdes — isso já dispara o bloco 3.

---

## Bloco 3 — Deploy automatizado chegando ao EKS (5:00–7:00)

**Mudar para a aba Actions**, abrir a execução que o merge acabou de disparar
(evento `push` em `homolog`) e acompanhar ao vivo:

- `Build & Push (ECR)` — build da imagem Docker e push pro ECR
- `Deploy (EKS)` — expandir os passos: Namespace → Secret → ConfigMap → Job de
  migration → Job de seed → Deployment/Service/HPA → **Forçar rollout** →
  Aguardar rollout → Smoke test `/health/ready`

**Falar enquanto passos rodam**: sem intervenção manual — da imagem nova no
ECR até os pods novos respondendo, é tudo o mesmo pipeline; o passo "Forçar
rollout" existe porque Secrets do Kubernetes não reiniciam pods sozinhos.

**Cortar para o terminal** assim que o job terminar:

```bash
kubectl get pods -n oficina-homolog
kubectl rollout status deployment/oficina-api -n oficina-homolog
```

Apontar a idade (`AGE`) dos pods — acabaram de subir.

---

## Bloco 4 — Consumo das APIs protegidas (7:00–10:00)

**Login interno e captura do token:**

```bash
TOKEN=$(curl -s -X POST "$ENDPOINT/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@oficina.com","senha":"senha123"}' | jq -r .token)
```

**Listar clientes (dado semeado pelo `db:seed`) e capturar o id do cliente de
teste:**

```bash
CLIENTE_ID=$(curl -s "$ENDPOINT/api/clientes" -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[] | select(.cpfCnpj=="52998224725") | .id')
echo "$CLIENTE_ID"
```

**Cadastrar um veículo para esse cliente** (a OS exige `placa` já vinculada):

```bash
curl -s -X POST "$ENDPOINT/api/veiculos" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"clienteId\":\"$CLIENTE_ID\",\"placa\":\"DEM0123\",\"marca\":\"Fiat\",\"modelo\":\"Uno\",\"ano\":2020}" | jq
```

**Abrir uma ordem de serviço:**

```bash
OS_ID=$(curl -s -X POST "$ENDPOINT/api/ordens-servico" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"cpfCnpj":"52998224725","placa":"DEM0123","quilometragemEntrada":15000}' \
  | jq -r '.id')
echo "$OS_ID"
```

**Transicionar o status ao vivo** (isso é o gancho para o dashboard do bloco
5 — cada transição emite o evento customizado `OrdemServicoStatusChanged`):

```bash
curl -s -X PATCH "$ENDPOINT/api/ordens-servico/$OS_ID/iniciar" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Mostrar tentativa sem token** (contraste rápido, ~10s):

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$ENDPOINT/api/clientes"
```

→ `401`, prova que a rota é realmente protegida.

---

## Bloco 5 — Dashboard de monitoramento sob carga, HPA escalando (10:00–13:00)

**Antes de começar a carga**, deixar visível lado a lado: o painel "Latência
e recursos do cluster" no New Relic e o terminal com:

```bash
kubectl get hpa -n oficina-homolog -w
```

**Gerar carga real contra uma rota protegida** (sem precisar instalar nada,
`npx` baixa na hora):

```bash
npx autocannon -c 50 -d 180 \
  -H "Authorization: Bearer $TOKEN" \
  "$ENDPOINT/api/clientes"
```

`-c 50` = 50 conexões simultâneas, `-d 180` = 3 minutos — ajuste a duração
para caber no tempo do bloco. Se depois de ~1 minuto as réplicas não
começarem a subir no `kubectl get hpa -w`, pode aumentar `-c` (ex.: `-c 100`)
em uma segunda leva.

**Enquanto a carga roda**, alternar a tela entre:
- `kubectl get hpa -n oficina-homolog -w` — apontar `TARGETS` subindo e
  `REPLICAS` indo de 2 para 3/4
- New Relic → dashboard "Latência e recursos do cluster" — apontar o gráfico
  de CPU por pod subindo e a latência (p50/p95/p99) reagindo
- New Relic → dashboard "Volume diário de OS" e "Tempo médio por status" —
  mostrar que o evento customizado da OS aberta no bloco 4 já aparece ali

**Falar**: o HPA (`ADR-002`) está configurado por CPU, limiar em
`k8s/hpa.yaml`; o `metrics-server` do `k8s-infra` é o que alimenta essas
métricas.

---

## Bloco 6 — Logs e traces correlacionados (13:00–15:00)

**Fazer uma chamada com um `x-correlation-id` escolhido à mão**, para achar
fácil nos dois lugares depois:

```bash
curl -s "$ENDPOINT/api/clientes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-correlation-id: demo-video-fase3" | jq
```

**Terminal — mostrar o log estruturado JSON do pod com esse `correlationId`:**

```bash
kubectl logs -n oficina-homolog -l app=oficina-api --tail=200 \
  | grep "demo-video-fase3" | jq
```

**Falar**: todo log é JSON estruturado (`pino`); o `x-correlation-id` do
header vira o campo `correlationId` em toda linha de log daquela requisição
inteira, sem precisar de request-id manual (`correlation-id.middleware.ts`).

**New Relic → Logs**: filtrar por `correlationId: 'demo-video-fase3'` e
mostrar o mesmo identificador correlacionando o log ao trace da transação
(distributed tracing ligado, `NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true`).

**Fechar mostrando a política de alertas** "Oficina — Fase 3" em New Relic →
Alerts & AI, citando rapidamente as 6 condições (erro 5xx, p95 degradado,
falha no processamento de OS, `CrashLoopBackOff`, CPU sustentada,
healthcheck via Synthetics) — não precisa disparar nenhuma ao vivo, só
mostrar que existem e estão ativas.

**Fala de encerramento (10s)**: recapitular os 4 repositórios e onde estão os
RFCs/ADRs (`docs/architecture/`) para quem quiser se aprofundar.

---

## Checklist final antes de exportar

- [ ] Duração total ≤ 15 minutos
- [ ] Áudio limpo (sem ruído de fundo, volume consistente)
- [ ] Todos os 6 blocos do PDF cobertos
- [ ] Endpoint e tokens usados são os reais (não capturas de tela antigas)
- [ ] Upload no YouTube/Vimeo como **não listado** (ou público) — link vai no
      PDF do Portal do Aluno
