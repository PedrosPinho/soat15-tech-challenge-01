# Planejamento de Desenvolvimento — Fase 2 (Tech Challenge SOAT)

## Contexto

A Fase 1 entregou um sistema de gestão de oficina mecânica (Node.js 20 + TypeScript strict + Express 5 + MongoDB/Mongoose) já organizado em camadas DDD (`domain/application/infrastructure/presentation`), com 534 testes e ~93% de cobertura. Não existem ainda: pipeline de CI/CD, manifestos Kubernetes, scripts Terraform, nem os recursos de aprovação de orçamento via webhook externo e atualização de status por e-mail. O objetivo da Fase 2, segundo o enunciado, é evoluir essa base para produção: refatorar aplicando Clean Code/Clean Architecture, cobrir fluxos críticos com testes, containerizar, orquestrar via K8s com autoscaling, provisionar infraestrutura via Terraform, montar pipeline de CI/CD completo, e atualizar APIs e README/entregáveis.

Este documento é o **plano de desenvolvimento** (backlog priorizado por entrega, não o código em si). Ele assume decisões padrão pragmáticas para um projeto de curso (sem custo de nuvem obrigatório); pontos de decisão estão marcados como **[DECISÃO]** para confirmação do usuário antes da implementação.

**[DECISÃO] Padrões assumidos** (ajustáveis a qualquer momento):
- Cluster K8s provisionado via Terraform: **kind** (Kubernetes-in-Docker) local, sem custo de cloud — alternativa: AWS EKS ou GCP GKE se o grupo tiver créditos disponíveis.
- Notificação por e-mail: **Nodemailer + SMTP** configurável por env vars (testável localmente com Mailhog/Ethereal) — alternativa: AWS SES/SendGrid.
- Escopo do refactor arquitetural: **reforço leve** — mantém a estrutura de pastas atual (já é DDD em camadas, próxima de hexagonal) e formaliza as bordas (composition root/DI, ports explícitos para e-mail/webhook), em vez de reescrever para pastas `ports/adapters` canônicas.
- CI/CD: **GitHub Actions**, já que o repositório está no GitHub.

---

## Visão geral das entregas (mapeadas ao enunciado)

1. Evolução da aplicação (Clean Code, testes, novas/alteradas APIs)
2. Containerização (Docker/Compose revisados)
3. Kubernetes (`/k8s`)
4. Terraform (`/infra`)
5. CI/CD (GitHub Actions)
6. README + documentação de arquitetura + vídeo + PDF de entrega

---

## Etapa 1 — Evolução da aplicação

### 1.1 Clean Code / Clean Architecture (reforço leve)
- Introduzir uma **composition root** por módulo de rota (ou um container simples) para eliminar o `new MongoXRepository()` + `new UseCase(...)` espalhado dentro dos arquivos de rota (`src/presentation/routes/*.routes.ts`). Hoje isso acopla a camada de apresentação diretamente à infraestrutura Mongo.
- Extrair **ports** explícitos em `src/domain/services/` (ou novo `src/domain/ports/`) para as novas integrações externas: `INotificationService` (envio de e-mail) e `IBudgetApprovalGateway` (se necessário abstrair o webhook de aprovação). Implementações concretas ficam em `src/infrastructure/notifications/` (Nodemailer) e `src/infrastructure/webhooks/`.
- Revisar nomes/coesão nos arquivos já existentes (ex.: `ordem-servico.entity.ts`, use-cases) — aplicar Clean Code pontual onde encontrado durante o trabalho, sem reescrita ampla desnecessária.
- Adicionar testes automatizados para os fluxos críticos que ainda faltam (ver `docs/PROJECT_STATUS.md`): **integração com MongoDB** (`tests/infrastructure/database/mongodb/repositories/`) e **E2E dos fluxos de OS** (`tests/integration/`), especialmente o ciclo completo `RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA → ENTREGUE` e a listagem/ordenação.

### 1.2 APIs a alterar/criar

**Abertura de OS** — já existe (`POST /api/ordens-servico`, `create-ordem-servico.use-case.ts`). Revisar apenas para garantir que retorna claramente `numeroOS`/`id` como identificação única (já ocorre via `NumeroOS`).

**Consulta de status da OS** — já existe (`GET /api/ordens-servico/:id`, e o público `GET /api/ordens-servico/buscar` por CPF/CNPJ). Ação: nenhuma mudança estrutural necessária; garantir que o DTO de resposta expõe claramente o status atual (`OrdemServicoResponseDto`).

**Aprovação de orçamento (novo)** — hoje `PATCH /:id/aprovar` exige `authMiddleware` (uso interno). O enunciado pede um endpoint para **notificações externas** de aprovação/recusa do cliente. Plano:
- Novo endpoint público (ou autenticado via secret/token de webhook, não JWT de usuário) `POST /api/ordens-servico/:id/orcamento/webhook` recebendo `{ aprovado: boolean, motivo?: string }`.
- Novo use-case `ProcessarAprovacaoOrcamentoUseCase` que, dependendo do payload, chama `aprovar()` (novo caminho `AGUARDANDO_APROVACAO → EM_EXECUCAO`, já suportado pela entidade) ou `cancelar(motivo)` em caso de recusa.
- Validar payload com um validator dedicado (`validateAprovacaoWebhook`), e proteger o endpoint com verificação de assinatura/token simples (env var `WEBHOOK_SECRET`), documentando isso no README como "Secrets" do K8s.

**Listagem de OS (alterar)** — `IOrdemServicoRepository.list()` e `MongoOrdemServicoRepository` precisam de:
- Ordenação customizada por status na ordem: `EM_EXECUCAO > AGUARDANDO_APROVACAO > EM_DIAGNOSTICO > RECEBIDA` (mapear para um peso numérico, ex. via `$addFields`/`$switch` no aggregate do Mongo, ou ordenar em memória após buscar), com desempate por mais antigas primeiro (`dataAbertura` ascendente).
- Excluir da listagem (mas não fisicamente) as OS com status `FINALIZADA` e `ENTREGUE` — como a entidade já tem esses status, basta um filtro `$nin: ['FINALIZADA', 'ENTREGUE']` por padrão no `ListOrdensServicoUseCase`/`list()`. Nenhum campo novo de soft-delete é necessário aqui — o próprio status já serve como o "soft delete lógico" pedido.
- Atualizar `list-ordens-servico.use-case.ts`, `IOrdemServicoRepository.list()` (assinatura) e `ordem-servico.repository.impl.ts` (query Mongo) em conjunto; cobrir com testes de unidade (ordenação) e integração (query real no Mongo).

**Atualização de status da OS via e-mail (novo)**:
- Adicionar `INotificationService.enviarAtualizacaoStatus(destinatario, os)` chamado a partir dos use-cases de transição de status existentes (`iniciar`, `aguardar-aprovacao`, `aprovar`, `concluir`, `entregar`, `cancelar`) — cada um, após persistir a mudança, dispara o e-mail (fire-and-forget ou fila simples, sem bloquear a resposta HTTP).
- Implementação concreta `NodemailerNotificationService` em `src/infrastructure/notifications/`, configurada via env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) — mapeadas para Secrets no K8s.
- Endereço de e-mail do cliente: verificar se `Cliente` entity já tem campo `email`; caso não tenha, adicionar (campo simples, validação de formato) — ponto a confirmar durante implementação.
- Testes: mock do `INotificationService` nos use-cases (unit) + um teste de integração usando Ethereal/Mailhog opcional.

---

## Etapa 2 — Containerização

- Revisar `Dockerfile` existente (multi-stage, non-root, healthcheck) — validar que builda a versão pós-refactor sem mudanças de runtime esperadas.
- Revisar `docker-compose.yml`: manter serviços `mongodb` + `app`, garantir variáveis novas (SMTP, WEBHOOK_SECRET) documentadas em `.env.example`.
- Nenhuma mudança estrutural grande esperada aqui — já é sólido.

---

## Etapa 3 — Kubernetes (`/k8s`)

Criar manifestos YAML organizados por recurso (ex. `k8s/deployment.yaml`, `k8s/service.yaml`, `k8s/configmap.yaml`, `k8s/secret.yaml`, `k8s/hpa.yaml`, `k8s/mongodb.yaml`, `k8s/namespace.yaml`):
- **Namespace** dedicado (`oficina`).
- **Deployment** da API (imagem buildada a partir do Dockerfile, replicas iniciais 2, resource requests/limits definidos para permitir HPA).
- **Service** (ClusterIP, expondo a porta 3001) + opcional Ingress/NodePort para acesso externo em ambiente local.
- **ConfigMap** para variáveis não sensíveis (porta, nome do banco, flags).
- **Secret** para variáveis sensíveis (Mongo URI/senha, JWT_SECRET, SMTP_PASS, WEBHOOK_SECRET) — gerado via `kubectl create secret` documentado (não commitado em texto plano).
- **HPA** (`autoscaling/v2`) baseado em CPU (e opcionalmente memória), min/max replicas, para atender "escalabilidade dinâmica em horários de pico".
- **MongoDB** no cluster: Deployment/StatefulSet + Service + PVC (ou, alternativa mais simples, usar MongoDB gerenciado fora do cluster — mas dado o padrão local assumido, um StatefulSet simples com volume é suficiente para demo).

---

## Etapa 4 — Terraform (`/infra`)

- Provider `kind` (ou `docker`) para criar o cluster localmente via Terraform, OU módulo equivalente para EKS/GKE se a decisão de cloud mudar.
- Recurso de banco de dados: pode ser o próprio MongoDB dentro do cluster (módulo Terraform aplica os manifestos K8s via `kubernetes` provider) ou um banco gerenciado, dependendo da decisão de cloud.
- Documentar em `infra/README.md`: quais recursos são criados (cluster, namespace, node pool/config, banco), como aplicar (`terraform init/plan/apply`), variáveis necessárias (`terraform.tfvars.example`), e como destruir.

---

## Etapa 5 — CI/CD (GitHub Actions)

Criar `.github/workflows/ci-cd.yml` com jobs sequenciais:
1. **build** — checkout, setup Node 20, `npm ci`, `npm run build` (typecheck/compile).
2. **test** — `npm run test:coverage` (reaproveita thresholds do `jest.config.js`), publica cobertura.
3. **docker-build** — build da imagem Docker, push para um registry (GHCR, já que o repo é GitHub — evita configurar Docker Hub).
4. **deploy** — aplica manifestos K8s (`kubectl apply -f k8s/`) e/ou dispara `terraform apply` contra o cluster de destino; deploy do banco de dados (parte do mesmo apply, se MongoDB estiver nos manifestos K8s).
- Gatilho: `push`/`pull_request` para a branch principal; job de deploy condicionado a push na branch principal (ou tag).
- Segredos do pipeline (registry token, kubeconfig, credenciais de cloud se aplicável) via GitHub Secrets — documentar nomes esperados no README, sem valores reais.

---

## Etapa 6 — Documentação e entregáveis

- **README.md**: reescrever seções desatualizadas (endpoints de OS já divergem do texto atual — faltam `aguardar-aprovacao`, `aprovar`, `entregar`, `buscar`, e os novos endpoints de webhook), acrescentar:
  - Descrição da solução/objetivos da Fase 2.
  - Desenho da arquitetura (componentes da aplicação, infraestrutura provisionada, fluxo de deploy) — diagrama (Mermaid ou imagem) cobrindo App → Docker → K8s (Deployment/Service/HPA) → Terraform → CI/CD.
  - Instruções passo a passo: execução local, deploy em K8s, provisionamento via Terraform.
  - Link para collection de API (Swagger já existe em `/api/docs` — publicar/exportar coleção Postman ou reaproveitar o Swagger).
  - Placeholder para link do vídeo demonstrativo (a gravar depois: deploy, CI/CD rodando, consumo das APIs, autoscaling sob carga simulada — ex. `k6`/`autocannon`).
- Atualizar `docs/PROJECT_STATUS.md` com a Fase 2 conforme progresso.
- Preparar o PDF de entrega final (fora do escopo de código): link do repositório compartilhado com `soat-architecture`, diagrama de arquitetura, link do vídeo.

---

## Ordem de execução recomendada

1. Ajustes de aplicação (1.1 + 1.2) com testes — é pré-requisito para tudo que depende do comportamento da API (webhook, e-mail, listagem).
2. Docker/Compose (validação rápida, poucas mudanças).
3. K8s manifests (usa a imagem Docker já validada).
4. Terraform (provisiona onde os manifestos K8s serão aplicados).
5. CI/CD (une build → test → docker → deploy, testando o pipeline fim-a-fim contra a infra criada no passo 4).
6. README/arquitetura/vídeo/PDF por último, quando tudo estiver funcional para documentar com precisão.

## Verificação

- `npm run typecheck` / `npm run build` sem erros após o refactor.
- `npm run test:coverage` mantendo thresholds (≥80%) com os novos testes de integração/E2E.
- `docker compose up -d` sobe app + mongo saudáveis; smoke test manual dos endpoints novos (webhook de aprovação, listagem ordenada, disparo de e-mail via Mailhog local).
- `kubectl apply -f k8s/` em cluster kind local sobe os pods, HPA visível via `kubectl get hpa`; teste de carga simples para observar escalonamento.
- `terraform plan`/`apply` em `infra/` cria o cluster e recursos documentados sem erros; `terraform destroy` limpo.
- Pipeline do GitHub Actions verde de ponta a ponta (build, test, docker build/push, deploy) em um PR de teste.
