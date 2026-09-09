# Planejamento de Desenvolvimento — Fase 3 (Tech Challenge SOAT)

## Contexto

A Fase 2 elevou o sistema de gestão de oficina (Node.js 20 + TypeScript strict + Express 5 + MongoDB/Mongoose, DDD em camadas) a um estado "pronto para produção local": composition root em `src/main/`, port `INotificationService` com `NodemailerNotificationService`, webhook de aprovação de orçamento, listagem de OS reordenada por status, 606 testes com ~97% de cobertura, manifestos K8s em `k8s/`, Terraform em `infra/` provisionando um cluster **kind local**, e um pipeline `.github/workflows/ci-cd.yml` que builda, testa, publica no GHCR e faz deploy num kind efêmero dentro do runner.

A Fase 3 muda o patamar: sai o ambiente local e entra **operação corporativa em nuvem**. O enunciado exige API Gateway, autenticação serverless por CPF, **banco de dados gerenciado relacional**, cluster Kubernetes gerenciado com escalabilidade, Terraform, observabilidade com dashboards e alertas, **quatro repositórios separados** com CI/CD e deploy automático, e documentação arquitetural formal (diagramas de componentes e sequência, RFCs, ADRs, modelo ER com justificativa).

**Distância entre o que existe e o que a Fase 3 pede:**

| Requisito da Fase 3 | Estado atual (fim da Fase 2) | Natureza do trabalho |
|---|---|---|
| API Gateway | Inexistente — Express exposto direto | Novo |
| Autenticação serverless por CPF | JWT emitido pelo próprio app (`POST /api/auth/login`, e-mail + senha) | Novo + ajuste no app |
| Banco gerenciado relacional | MongoDB/Mongoose em StatefulSet no cluster | **Migração** (maior risco da fase) |
| Cluster K8s com escalabilidade | kind local + HPA já escrito | Portar para cluster gerenciado |
| Terraform | `infra/` provisiona kind via `null_resource` | Reescrever para provider de nuvem |
| Observabilidade | `/health` + logs de texto | Novo |
| 4 repositórios com CI/CD | 1 repositório, 1 workflow | Split + 3 pipelines novas |
| Documentação arquitetural (RFC/ADR/ER) | README + `docs/PROJECT_STATUS.md` | Novo |
| Notificações serverless | Nodemailer + SMTP/Mailhog | Trocar implementação da port |

Este documento é o **plano de desenvolvimento** (backlog priorizado por entrega, não o código em si). Assume decisões padrão pragmáticas para um projeto de curso; pontos de decisão estão marcados como **[DECISÃO]** para confirmação antes da implementação.

**[DECISÃO] Padrões assumidos** (ajustáveis a qualquer momento):

- **Nuvem: AWS via AWS Academy Learner Lab** (confirmado). O enunciado cita AWS API Gateway como primeiro exemplo e é a nuvem com o caminho mais curto entre os requisitos (API Gateway + Lambda + RDS + EKS num só provedor). O Learner Lab, porém, impõe restrições fortes que atravessam **todas** as etapas — ver a seção seguinte, que deve ser lida antes de qualquer decisão de infraestrutura.
- **Custos:** orçamento do Learner Lab (tipicamente US$ 50, sem cartão para estourar), com `db.t4g.micro` Single-AZ, node group `t3.small` de 2 nós e **sem NAT Gateway**. **EKS não tem free tier** (~US$ 0,10/h pelo control plane, ~US$ 73/mês se ficar de pé) — é o principal consumidor do orçamento. Disciplina obrigatória: `terraform destroy` ao fim de cada sessão de trabalho e `apply` no início da seguinte, o que também obriga a infra a ser reprodutível do zero (efeito colateral bom).
- **Banco gerenciado: Amazon RDS for PostgreSQL 16.** O enunciado exige "ajustes no modelo relacional, com diagramas ER e explicação dos relacionamentos" — o que descarta manter MongoDB (DocumentDB/Atlas não atenderiam ao pedido de modelo relacional). Alternativas: Aurora Serverless v2 (escala melhor, custa mais) ou RDS MySQL.
- **Acesso a dados: driver `pg` + migrations com `node-pg-migrate`**, mantendo as interfaces de `src/domain/repositories/` intactas e escrevendo SQL explícito nos repositórios — mesma filosofia de "reforço leve" da Fase 2, sem introduzir um ORM que imponha seu próprio modelo. Alternativas: Prisma (migrations e tipos gerados, mas duplica a camada de modelo) ou TypeORM.
- **Function serverless: AWS Lambda com Node.js 20 + TypeScript**, empacotada com `esbuild`, provisionada por Terraform no próprio repositório da Lambda.
- **Autenticação: Lambda de emissão de token + Lambda Authorizer no API Gateway.** A primeira valida o CPF e emite o JWT; a segunda protege as rotas. O app continua validando o JWT por conta própria (defesa em profundidade — o Service do EKS não deve confiar apenas na borda).
- **Cluster: Amazon EKS** com managed node group, `metrics-server` (pré-requisito do HPA já escrito) e AWS Load Balancer Controller. **Sem IRSA** — ver restrições do Learner Lab abaixo.
- **Observabilidade: New Relic.** Free tier perpétuo (100 GB/mês, 1 usuário full) cobre APM + infraestrutura K8s + logs + alertas + dashboards sem prazo de validade, ao contrário do trial de 14 dias do Datadog — relevante para um projeto que será avaliado depois de pronto. Alternativa: Datadog.
- **Logs estruturados: `pino`** em JSON, com `correlationId` propagado via `AsyncLocalStorage` e header `x-correlation-id` (gerado no API Gateway quando ausente).
- **Notificações serverless: Amazon SES** por trás da port `INotificationService` já existente. Alternativa mais aderente a "serverless": publicar evento em SNS/EventBridge consumido por uma Lambda de notificação (desacopla o envio da requisição HTTP, mas adiciona um quinto componente a operar).
- **Segredos: SSM Parameter Store (`SecureString`)** em vez do Secrets Manager — mais barato (tier padrão gratuito), disponível de forma mais confiável no Learner Lab e suficiente para o volume desta fase. Alternativa: Secrets Manager (~US$ 0,40/segredo/mês), se rotação automática virar requisito.
- **Estado do Terraform: backend S3 + trava em DynamoDB**, um `key` por repositório, com consumo cruzado via `terraform_remote_state` (o repo de K8s e a Lambda leem o endpoint do RDS; o repo da Lambda lê a VPC/subnets do repo de K8s).
- **Credenciais de CI: credenciais temporárias do Learner Lab em GitHub Secrets**, renovadas a cada sessão do lab. OIDC não é possível (ver restrições abaixo).
- **Branches:** `main` = produção, `homolog` = homologação. Ambas protegidas, merge só via Pull Request, deploy automático a cada push (que só ocorre via merge de PR).

---

## Restrições do AWS Academy Learner Lab (atravessam todas as etapas)

O Learner Lab não é uma conta AWS comum. As restrições abaixo **eliminam** algumas
práticas que seriam o padrão num projeto real, e cada uma delas precisa virar decisão
consciente e documentada (ADR), não improviso de última hora.

| Restrição | Consequência no plano | Como contornar |
|---|---|---|
| **IAM bloqueado** — não é possível criar usuários, roles, policies ou identity providers | Sem `GitHubActionsDeployRole`, sem IRSA, sem role de execução dedicada por Lambda | Usar a role pré-criada **`LabRole`** em tudo: execução da Lambda, node group do EKS, EC2. `iam:PassRole` para `LabRole` é permitido |
| **Sem `iam:CreateOpenIDConnectProvider`** | **OIDC do GitHub Actions é impossível** — a decisão original de "sem access keys estáticas" cai | Credenciais temporárias do lab (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, **`AWS_SESSION_TOKEN`**) em GitHub Secrets, renovadas a cada sessão |
| **Credenciais expiram junto com a sessão** (~4h) | Pipeline quebra sozinha entre uma sessão e outra; deploy automático não é "ligar e esquecer" | Script `scripts/refresh-aws-secrets.sh` usando `gh secret set` nos 4 repositórios de uma vez, rodado no início de cada sessão. Documentar isso no README — é uma limitação do ambiente, não um defeito da pipeline |
| **Sem IRSA** para dar permissão a pods | Pods não têm identidade própria | Pods herdam a `LabRole` pelo instance profile dos nós (via IMDS). **Concessão de segurança consciente**: todo pod do cluster passa a ter as permissões amplas da `LabRole`. Vira `ADR-006`, com a alternativa correta (IRSA) registrada como o que se faria numa conta real |
| **Orçamento ~US$ 50 e sessões de 4h** | Infra 24/7 é inviável | `destroy`/`apply` por sessão; alarme de billing; ensaiar e gravar o vídeo numa sessão só, com a infra recém-aplicada |
| **Região restrita** (na prática `us-east-1`) | Sem escolha de região | Fixar `us-east-1` em `variables.tf`, sem multi-região |
| **Cognito indisponível** | Não há atalho gerenciado para autenticação | Reforça a decisão de Lambda + JWT próprio — e vira argumento explícito na `RFC-003`, em vez de decisão arbitrária |
| **SES possivelmente restrito** (e, mesmo liberado, em *sandbox*: só envia para endereços verificados) | Notificação por e-mail pode não funcionar para CPFs/clientes arbitrários | Verificar no primeiro dia. Se liberado: sandbox com 2–3 endereços verificados, suficiente para a demonstração. Se bloqueado: manter `NodemailerNotificationService` apontando para um SMTP externo, **atrás da mesma port** — o requisito "notificações serverless" fica atendido em desenho e a limitação é documentada |
| **Recursos podem ser apagados ao fim do curso** | O "link do deploy ativo" do entregável pode morrer | Vídeo e screenshots são a prova durável; README explica como reconstruir tudo com `terraform apply` |

**Validação no primeiro dia de trabalho** (antes de escrever qualquer Terraform, para
não descobrir bloqueio depois de duas etapas prontas): confirmar no lab que é possível
criar **EKS**, **RDS**, **API Gateway**, **Lambda em VPC**, **ECR**, **S3 + DynamoDB**
e **SSM Parameter Store**, e que `LabRole` pode ser passada para cada um. **Plano B se
o EKS estiver bloqueado**: k3s em duas EC2 `t3.small` provisionadas por Terraform — o
enunciado pede "cluster Kubernetes com escalabilidade", não especificamente EKS, e os
manifestos de `k8s/` (incluindo o HPA) funcionam igual.

---

## Visão geral das entregas (mapeadas ao enunciado)

| # | Entrega | Requisito do enunciado |
|---|---|---|
| 0 | Fundação: contas AWS, backend de estado, split em 4 repositórios | Estrutura de Repositórios |
| 1 | Banco de dados gerenciado + migração MongoDB → PostgreSQL | Infraestrutura obrigatória / Modelagem |
| 2 | Autenticação serverless por CPF + API Gateway | Autenticação e API Gateway |
| 3 | Cluster Kubernetes gerenciado via Terraform | Infraestrutura obrigatória |
| 4 | Aplicação principal adaptada (dados, logs, notificações) | Aplicação em Kubernetes |
| 5 | Monitoramento, dashboards e alertas | Monitoramento e Observabilidade |
| 6 | Documentação arquitetural (componentes, sequência, RFC, ADR, ER) | Documentação da Arquitetura |
| 7 | CI/CD por repositório, proteção de branches e entregáveis finais | CI/CD + Entregável |

### Mapa dos 4 repositórios

| Repositório | Conteúdo | Depende de |
|---|---|---|
| `soat15-tech-challenge-db-infra` | Terraform: VPC, RDS PostgreSQL, SSM Parameter Store, security groups | — |
| `soat15-tech-challenge-k8s-infra` | Terraform: EKS, node group, ECR, addons, aplicação dos manifestos | db-infra (VPC/SG) |
| `soat15-tech-challenge-auth-lambda` | Lambda de autenticação por CPF + Lambda Authorizer + API Gateway (Terraform) | db-infra (endpoint/segredo), k8s-infra (VPC Link) |
| `soat15-tech-challenge-01` (este) | Aplicação principal, manifestos `k8s/`, documentação arquitetural | todos os anteriores |

**[DECISÃO] Onde fica a VPC:** assumida no repositório de banco (é quem precisa de subnets privadas primeiro), exportada por `terraform_remote_state` para os demais. Alternativa: um quinto repositório só de rede — descartado por contrariar o enunciado (quatro repositórios).

---

## Etapa 0 — Fundação e split de repositórios ✅ Concluída

> Learner Lab validado, 4 repositórios criados (`main`+`homolog`), bootstrap do
> estado Terraform (S3+DynamoDB) e `soat-architecture` como colaborador nos 4.
> Status detalhado em [`PHASE_3_EXECUTION_GUIDE.md`](PHASE_3_EXECUTION_GUIDE.md).

- Abrir o Learner Lab, rodar a checklist de validação da seção anterior e anotar o ARN da `LabRole` (é entrada de variável em praticamente todos os módulos Terraform).
- Bootstrap manual (uma vez, fora dos 4 repos ou num diretório `bootstrap/` do repo de banco): bucket S3 versionado para o estado e tabela DynamoDB de lock. **Estes dois sobrevivem ao ciclo destroy/apply** — não entram no `terraform destroy` de fim de sessão, senão o estado morre junto.
- Criar os 3 repositórios novos, cada um já com: `README.md`, `.gitignore`, workflow de CI, e as branches `main` + `homolog`.
- Aplicar em **todos os 4** as regras de proteção exigidas: `main` e `homolog` sem push direto, PR obrigatório com pelo menos 1 aprovação, status checks de CI obrigatórios, sem force-push. Documentar as regras num `docs/BRANCH_PROTECTION.md` (ou seção do README) e capturar screenshot para o PDF de entrega.
- Adicionar o usuário **`soat-architecture`** como colaborador nos 4 repositórios (item explícito do entregável).
- Escrever `scripts/refresh-aws-secrets.sh`: lê as credenciais da sessão do lab e as publica via `gh secret set` nos 4 repositórios (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`). Sem isso, toda pipeline falha a partir da segunda sessão de trabalho.
- Neste repositório: nada é removido nesta etapa. `infra/` (kind) e `k8s/mongodb.yaml`/`k8s/mailhog.yaml` só saem quando os substitutos estiverem funcionando (Etapas 1 e 3), preservando um caminho de execução local funcional durante toda a migração.

---

## Etapa 1 — Banco de dados gerenciado e migração relacional

> **Status**: 1.1 (Terraform do RDS) ✅ código escrito e pushado em `db-infra`,
> `terraform apply` não confirmado. 1.2/1.3 (modelo relacional + camada Postgres na
> aplicação) ✅ **concluídas** — todos os agregados, incluindo `OrdemServico`/
> `Servico`/`Pagamento`, têm repositório Postgres testado. Detalhes em
> [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md).

### 1.1 Provisionamento (`soat15-tech-challenge-db-infra`)

- VPC com subnets públicas e privadas em 2 AZs, Internet Gateway, route tables. **Sem NAT Gateway** (~US$ 32/mês, inviável no orçamento): os nós do EKS ficam em subnets públicas com security group restrito, e a Lambda em subnet privada — ela só precisa alcançar o RDS, não a internet. Se algum componente precisar de acesso a serviço AWS de dentro da subnet privada, usar **VPC Endpoints** (Gateway endpoint de S3 é gratuito; Interface endpoints custam por hora — avaliar caso a caso).
- `aws_db_subnet_group` nas subnets privadas + `aws_security_group` liberando 5432 apenas para o SG dos nós do EKS e para o SG da Lambda.
- `aws_db_instance` PostgreSQL 16, `db.t4g.micro`, 20 GB gp3, `storage_encrypted = true`, `backup_retention_period = 0`, `deletion_protection = false` e `skip_final_snapshot = true` — o oposto do que se faria em produção real, mas obrigatório aqui: o ciclo destroy/apply por sessão trava se houver proteção de exclusão ou snapshot final. Registrar a divergência no README do repositório para que não seja lida como descuido.
- Senha gerada por `random_password` e guardada em `aws_ssm_parameter` do tipo `SecureString` — nunca em variável de ambiente do pipeline. (O valor ainda fica no estado do Terraform; por isso o bucket S3 do estado é privado e versionado.)
- Ambientes `homolog` e `prod` via workspaces do Terraform ou diretórios `envs/`.
- Outputs: `db_endpoint`, `db_name`, `db_secret_param_name`, `vpc_id`, `public_subnet_ids`, `private_subnet_ids`, `db_security_group_id`.
- **Seed de dados após cada `apply`**: como o banco é recriado a cada sessão, `npm run db:seed` (Etapa 1.2) deixa de ser conveniência e vira parte do procedimento — sem cliente cadastrado não há CPF para a Lambda autenticar na demonstração.

### 1.2 Modelo relacional

Normalizar o que hoje é documento. O ponto central é a coleção `ordens-servico`, que embute o array `servicos`, que por sua vez embute `pecasUtilizadas`:

| Tabela | Origem | Observações |
|---|---|---|
| `clientes` | `clientes` | `cpf_cnpj` UNIQUE; `tipo` enum (`PF`/`PJ`); endereço achatado em colunas (`logradouro`, `numero`, `cidade`, `uf`, `cep`) — o VO `Endereco` continua reconstruindo-o no domínio |
| `veiculos` | `veiculos` | FK `cliente_id`; `placa` UNIQUE |
| `pecas` | `pecas` | `codigo` UNIQUE; enums `categoria_peca` e `unidade_medida`; índice GIN `to_tsvector('portuguese', descricao)` substituindo o índice `$text` do Mongo |
| `itens_estoque` | `itens-estoque` | FK `peca_id` UNIQUE (1:1); `CHECK (quantidade_disponivel >= 0 AND quantidade_reservada >= 0)` — invariantes hoje garantidas só no `ItemEstoque` |
| `catalogo_servicos` | `catalogo-servicos` | — |
| `ordens_servico` | `ordens-servico` (raiz) | FKs `cliente_id`, `veiculo_id`; `numero_os` UNIQUE; enum `status_os` |
| `servicos_os` | array `servicos` embutido | **Novo**: FK `ordem_servico_id` ON DELETE CASCADE, enum `status_servico`, `ordem` para preservar a sequência do array |
| `servico_pecas` | array `pecasUtilizadas` embutido | **Novo**: FKs `servico_os_id` + `peca_id`, `quantidade`, `preco_unitario` (preço histórico, não segue o preço atual da peça) |
| `pagamentos` | `pagamentos` | FK `ordem_servico_id`; enums `forma_pagamento`, `status_pagamento`; índice único parcial garantindo no máximo um pagamento `CONFIRMADO` por OS (hoje isso é a flag `temPagamento` na OS) |
| `usuarios` | `users` | Usuários internos da oficina (login e-mail/senha) — distinto de `clientes`, que autenticam por CPF via Lambda |

- `OSCounterModel` (coleção-contador de `numeroOS`, incrementada por `findByIdAndUpdate` + `$inc`) é substituída por uma **`SEQUENCE` nativa** do PostgreSQL: a mesma garantia de atomicidade, sem uma coleção auxiliar e sem um round-trip extra por criação de OS.
- Todas as chaves permanecem `uuid` em `VARCHAR(36)`/`UUID` para não invalidar IDs já emitidos e manter as factories `create()` do domínio inalteradas.
- Migrations versionadas em `src/infrastructure/database/postgres/migrations/`, aplicadas por `npm run db:migrate` — e como **Job de `initContainer`/`Job` do K8s** antes do rollout (ver Etapa 3), nunca manualmente.
- Corrigir de passagem os scripts `db:seed`/`db:reset` do `package.json`, que hoje apontam para arquivos inexistentes (achado registrado na Fase 2): passam a semear usuário admin, catálogo de serviços e peças no novo schema.

### 1.3 Camada de infraestrutura na aplicação

- Novo diretório `src/infrastructure/database/postgres/` com `pool.ts` (pool `pg` com retry e graceful shutdown, espelhando o `connection.ts` do Mongo), `repositories/` e `mappers/`.
- Cada repositório novo implementa a **mesma interface** de `src/domain/repositories/` — logo, use cases, controllers, DTOs, mappers de aplicação e todos os testes de `tests/domain` e `tests/application` permanecem intactos. O blast radius fica confinado a `src/infrastructure/database/` e ao composition root `src/main/factories/`.
- Traduções não triviais a atenção especial:
  - **Listagem ordenada de OS** (`MongoOrdemServicoRepository.list()`): o `$addFields`/`$switch` que atribui peso ao status vira `ORDER BY CASE status WHEN 'EM_EXECUCAO' THEN 1 ... END, data_abertura ASC`; o `$nin: ['FINALIZADA','ENTREGUE']` vira `WHERE status <> ALL(...)`.
  - **Carga da OS completa**: hoje um único `findOne` traz a árvore inteira; em SQL vira um `JOIN` de 3 níveis (`ordens_servico` → `servicos_os` → `servico_pecas`) remontado em memória pelo mapper. Cuidado com N+1 na listagem — carregar serviços em lote por `WHERE ordem_servico_id = ANY($1)`.
  - **Escrita da OS**: `save()` de uma raiz de agregação passa a ser transacional (`BEGIN` … `COMMIT`) com `DELETE`+`INSERT` dos filhos, já que a entidade é imutável e sempre chega inteira.
  - **Estoque**: `reservar`/`utilizar` passam a usar `UPDATE ... WHERE quantidade_disponivel >= $1` (atualização condicional) ou `SELECT ... FOR UPDATE`, para não perder concorrência que o documento único garantia de graça.
- Testes: substituir `mongodb-memory-server` por **Testcontainers PostgreSQL** nos testes de `tests/infrastructure/` e `tests/integration/`, com um `globalSetup` do Jest subindo um container por execução e as migrations aplicadas antes da suíte. Meta: manter os thresholds atuais (≥80% no `jest.config.js`; a cobertura real é ~97%).
- Remoção do Mongo (`mongoose`, schemas, `k8s/mongodb.yaml`) só depois que a suíte completa passar contra PostgreSQL.

---

## Etapa 2 — Autenticação serverless por CPF e API Gateway

> **Status**: 2.1/2.2 (Lambdas de token/authorizer + API Gateway) ✅ código escrito
> e pushado em `auth-lambda`, `terraform apply` não confirmado. 2.3 (ajustes de
> `authMiddleware`/escopos na aplicação principal) ✅ **concluída** — token
> interno e de cliente aceitos, `requireInternalScope` nas rotas de gestão,
> `/buscar` fechado por CPF próprio. Detalhes em
> [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md).

### 2.1 Lambda de emissão de token (`soat15-tech-challenge-auth-lambda`)

Handler `POST /auth/token` recebendo `{ "cpf": "12345678901" }`:

1. **Validar o CPF** — reaproveitar a lógica de dígitos verificadores de `src/domain/value-objects/cpf-cnpj.vo.ts`. **[DECISÃO]** copiar o arquivo para o repo da Lambda (simples, sem infraestrutura de publicação) em vez de extrair um pacote npm compartilhado no GitHub Packages; se a duplicação incomodar, o pacote é o caminho, ao custo de mais um pipeline.
2. **Consultar o cliente** no RDS (`SELECT id, nome, ativo FROM clientes WHERE cpf_cnpj = $1`), com credenciais lidas do SSM Parameter Store e cacheadas entre invocações (fora do handler, para aproveitar o reuso de container).
3. **Emitir o JWT** assinado com o mesmo `JWT_SECRET` que a API usa (também no Parameter Store), com claims `sub` (id do cliente), `cpf`, `scope: "cliente"` e expiração curta.

Respostas: `200` com o token; `400` CPF inválido; `404` cliente não cadastrado; `403` cliente inativo. **Nunca** revelar por mensagem de erro a diferença entre "não existe" e "inativo" no corpo público — diferenciar apenas no log estruturado.

Detalhes operacionais: Lambda em subnet privada (para alcançar o RDS), **role de execução `LabRole`** (não há como criar uma role dedicada), `reserved_concurrency` limitado, timeout 10s. Sem NAT na VPC, a Lambda não alcança a internet — se precisar do Parameter Store de dentro da subnet privada, adicionar um Interface VPC Endpoint para SSM ou injetar o segredo como variável de ambiente cifrada no `apply`. **[DECISÃO]** conexão direta ao PostgreSQL com pool de tamanho 1 e `SET idle_session_timeout` — RDS Proxy resolveria o esgotamento de conexões em rajada, mas custa por hora e o volume do projeto não justifica; registrar como risco no ADR.

### 2.2 Lambda Authorizer + API Gateway

- **HTTP API** (mais barata e simples que a REST API; se `usage plans`/API keys forem exigidos na demonstração, trocar por REST API).
- Rotas **públicas**: `POST /auth/token` (integração direta com a Lambda), `GET /health`, `GET /api/docs`.
- Rotas **protegidas** (todo o resto de `/api/*`): integração `HTTP_PROXY` via **VPC Link** para o Network Load Balancer interno do EKS, com um **Lambda Authorizer** (`REQUEST`, com cache de 300s por token) validando assinatura, expiração e situação do cliente.
- O authorizer injeta `clienteId`/`cpf` no contexto, repassados como headers ao backend.
- Throttling e logging de acesso do API Gateway habilitados (o `express-rate-limit` do app continua como segunda linha).

### 2.3 Ajustes na aplicação principal

- `authMiddleware` passa a aceitar **dois tipos de token**: o de usuário interno (fluxo `POST /api/auth/login` já existente, claim `scope: "interno"`) e o de cliente por CPF (`scope: "cliente"`). Continua validando a assinatura localmente — a borda não é o único guardião.
- **[DECISÃO] Autorização por escopo:** o token de cliente só dá acesso aos próprios dados (consulta de status das próprias OS, aprovação de orçamento); rotas de gestão (peças, catálogo, relatórios, criação de OS) exigem `scope: "interno"`. Isso é uma restrição nova sobre rotas que hoje aceitam qualquer JWT válido — vale um teste de integração por rota protegida.
- O endpoint público `GET /api/ordens-servico/buscar?cpfCnpj=` (hoje sem autenticação) passa a exigir o token de cliente, atendendo a "proteger rotas sensíveis da aplicação com autenticação via CPF".

---

## Etapa 3 — Infraestrutura Kubernetes gerenciada (`soat15-tech-challenge-k8s-infra`)

> **Status**: ✅ código escrito e pushado (EKS, node group, addons, ECR),
> `terraform apply` não confirmado.

- `aws_eks_cluster` + `aws_eks_node_group` gerenciado (`t3.small`, min 2 / max 4) nas subnets privadas da VPC exportada pelo repo de banco.
- Addons: `vpc-cni`, `coredns`, `kube-proxy`, **`metrics-server`** (sem ele o `k8s/hpa.yaml` já escrito não coleta métricas) e AWS Load Balancer Controller via Helm.
- **Sem IRSA** (bloqueado pelo IAM do Learner Lab): cluster role e node role são a `LabRole`, e os pods herdam essas permissões pelo instance profile dos nós via IMDS. É a concessão de segurança registrada no `ADR-006` — numa conta real, cada ServiceAccount teria sua própria role de permissão mínima.
- `aws_ecr_repository` para a imagem da API, com lifecycle policy mantendo as últimas N tags. Como os nós usam a `LabRole`, o pull do ECR funciona sem `imagePullSecret`.
- Namespace `oficina` + Secret populado a partir do SSM Parameter Store no momento do apply (o External Secrets Operator seria o caminho correto, mas depende de IRSA — fica registrado como evolução futura), substituindo o `k8s/secret.example.yaml` preenchido à mão.
- Manifestos: reaproveitar `k8s/` deste repositório com as mudanças — remover `mongodb.yaml` e `mailhog.yaml`, trocar `image: oficina-api:local` pela tag do ECR, adicionar `Service` do tipo LoadBalancer **interno** (NLB) como alvo do VPC Link, e um `Job` de migration executado antes do rollout. **[DECISÃO]** os manifestos continuam versionados no repositório da aplicação (é ela quem os altera a cada mudança de env var) e o repo de infra aplica-os por referência; a alternativa é movê-los para o repo de infra, ao custo de acoplar dois pipelines a cada nova variável.
- HPA: manter o `autoscaling/v2` por CPU já escrito, agora sobre métricas reais, e demonstrar o escalonamento sob carga (`k6`) no vídeo.

---

## Etapa 4 — Aplicação principal adaptada

> **Status**: ✅ Concluída — dados, logs, notificações, healthchecks e
> `docker-compose.yml` feitos e testados (528 testes + 65 de integração
> Postgres, smoke test manual ponta a ponta). Swagger com o fluxo de CPF e
> Postman collection também concluídos, depois que a Etapa 2.3 foi feita.
> Detalhes em [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md).

- **Dados**: trocar a fábrica de repositórios em `src/main/factories/` para as implementações PostgreSQL (Etapa 1) e remover `mongoose`.
- **Logs estruturados**: substituir os `console.log`/`console.error` por `pino` em JSON, com um middleware que lê ou gera `x-correlation-id`, guarda em `AsyncLocalStorage` e injeta em todo log da requisição — inclusive nos logs da Lambda, para correlacionar a autenticação com a chamada subsequente.
- **Notificações**: nova implementação `SesNotificationService` da port `INotificationService` já existente. `NodemailerNotificationService` fica como implementação de desenvolvimento local (Mailhog no `docker-compose.yml`), escolhida por env var — a port foi desenhada exatamente para isso na Fase 2.
- **Healthchecks**: separar `/health/live` (processo vivo) de `/health/ready` (banco alcançável), alinhando com as probes já diferenciadas no `k8s/deployment.yaml`.
- **Swagger**: atualizar `src/swagger.ts` com o fluxo de token por CPF, o novo esquema de segurança e os escopos, e exportar uma collection Postman para o entregável.
- **`docker-compose.yml`**: trocar `mongodb` por `postgres:16` + manter `mailhog`, para que o ambiente local continue subindo com um comando.

---

## Etapa 5 — Monitoramento e observabilidade (New Relic)

- **APM**: agente `newrelic` no app (carregado antes do bundle), Lambda instrumentada por layer do New Relic.
- **Infraestrutura K8s**: `nri-bundle` via Helm no EKS — coleta CPU/memória de pods e nós, eventos e estado do cluster.
- **Logs**: forwarder do New Relic consumindo o stdout JSON dos pods; `correlationId` como atributo indexado, ligando log ↔ trace ↔ requisição.
- **Métricas de negócio**: instrumentar `src/application/use-cases/ordem-servico/notificar-mudanca-status.helper.ts` — ele já é chamado por **todos** os use-cases de transição de status, sendo o ponto natural para emitir um evento customizado `OrdemServicoStatusChanged`. Hoje ele recebe apenas a OS já atualizada; para calcular tempo por status é preciso passar também o status anterior (ajuste de assinatura pequeno, propagado aos 6 use-cases que o chamam). Vale de passagem trocar o `console.error` do `catch` pelo logger estruturado, para que a falha de notificação apareça no alerta de integrações.
- **Dashboards exigidos**:
  - Volume diário de OS abertas (contagem de `RECEBIDA` por dia).
  - Tempo médio por status (Diagnóstico, Execução, Finalização) — derivado do evento customizado acima.
  - Erros e falhas nas integrações (SES, RDS, Lambda de auth).
  - Latência p50/p95/p99 por rota e consumo de CPU/memória do cluster.
- **Alertas** (NRQL alert conditions → e-mail/Slack): taxa de erro 5xx acima do limite, p95 de latência degradado, **falha no processamento de ordens de serviço** (exceção em qualquer use-case de transição de status), pods em `CrashLoopBackOff`, healthcheck/uptime via Synthetics, e CPU sustentada acima do alvo do HPA.

---

## Etapa 6 — Documentação da arquitetura

Fonte da verdade em `docs/architecture/` **neste** repositório, com link nos READMEs dos outros três:

- `component-diagram.md` — diagrama de componentes (Mermaid) com a visão de nuvem: cliente → API Gateway → (Lambda Authorizer, Lambda de token) → VPC Link → NLB → EKS (pods da API + HPA) → RDS PostgreSQL, mais SES (ou SMTP externo), SSM Parameter Store, ECR e New Relic.
- `sequence-auth.md` — diagrama de sequência do fluxo de autenticação por CPF (cliente → API Gateway → Lambda → RDS → JWT → chamada protegida → Authorizer → EKS).
- `sequence-abertura-os.md` — diagrama de sequência da abertura de OS, incluindo a transação no PostgreSQL e a notificação via SES.
- `rfcs/` — `RFC-001` escolha da nuvem; `RFC-002` escolha do banco de dados (com a justificativa formal exigida pelo enunciado: por que relacional, por que PostgreSQL, o que se ganha e o que se perde saindo do MongoDB); `RFC-003` estratégia de autenticação (CPF + serverless, por que não Cognito); `RFC-004` estratégia de observabilidade.
- `adrs/` — `ADR-001` REST síncrono via API Gateway como padrão de comunicação; `ADR-002` HPA por CPU (limiares e por que não KEDA/métricas customizadas); `ADR-003` split em quatro repositórios e ordem de aplicação do Terraform; `ADR-004` modelo relacional normalizado (por que `servicos_os`/`servico_pecas` em vez de colunas `jsonb`); `ADR-005` notificações via SES por trás da port existente; `ADR-006` uso da `LabRole` compartilhada em lugar de IRSA — concessão deliberada ao AWS Academy, com o desenho correto documentado para uma conta real.
- `data-model.md` — **diagrama ER** (Mermaid `erDiagram`) com todas as tabelas da Etapa 1.2, cardinalidades, chaves e a explicação de cada relacionamento; seção sobre índices e sobre as invariantes que migraram do código para constraints do banco.
- Templates curtos de RFC e ADR (`rfcs/TEMPLATE.md`, `adrs/TEMPLATE.md`) para manter o formato consistente.
- Atualizar `docs/PROJECT_STATUS.md` com a Fase 3 conforme o progresso, como foi feito na Fase 2.

---

## Etapa 7 — CI/CD, proteção de branches e entregáveis

> **Status**: pipelines dos 4 repositórios ✅ **escritos e commitados**
> (`scripts/refresh-aws-secrets.sh` incluído) — nenhum ainda **executado** de
> verdade (depende de sessão ativa do Learner Lab + `terraform apply` dos 3
> repos de infra confirmado). Proteção de branches e entregáveis finais
> (README por repo, vídeo, PDF) seguem pendentes. Detalhes em
> [`PHASE_3_TASKS.md`](PHASE_3_TASKS.md).

Um pipeline por repositório, todos autenticando na AWS com as credenciais temporárias do Learner Lab (`aws-actions/configure-aws-credentials` com `aws-session-token`), renovadas por `scripts/refresh-aws-secrets.sh` no início de cada sessão:

| Repositório | Pipeline |
|---|---|
| `db-infra` | `fmt` → `validate` → `tflint` → `plan` (em PR, comentado no PR) → `apply` (push em `homolog`/`main`) |
| `k8s-infra` | idem, mais um smoke test `kubectl get nodes` pós-apply |
| `auth-lambda` | lint → testes unitários (validação de CPF, emissão de token) → build `esbuild` → `terraform apply` → teste de fumaça invocando a Lambda com um CPF de fixture |
| Aplicação | build → testes com Testcontainers → build da imagem → push no ECR → `Job` de migration → `kubectl set image` + `rollout status` → smoke test `/health` |

- **Deploy automático por branch**: push em `homolog` implanta no ambiente de homologação; push em `main` implanta em produção. Como ambas são protegidas, todo deploy nasce de um PR aprovado.
- **[DECISÃO] Homolog e produção no mesmo lab**: o orçamento não comporta dois EKS simultâneos. Assumido: `homolog` e `prod` como *workspaces* Terraform que compartilham o cluster, separados por **namespace** (`oficina-homolog` / `oficina-prod`) e por banco lógico distinto no mesmo RDS. Alternativa se houver crédito: dois ambientes de verdade, ao dobro do custo.
- **Falha esperada de pipeline**: se a primeira execução do dia falhar com `ExpiredToken`, o procedimento é rodar o script de refresh e re-executar — documentar isso no README para não parecer instabilidade da pipeline.
- Rollback: `kubectl rollout undo` documentado no README da aplicação; para Terraform, revert do PR + novo `apply`.
- **Entregáveis finais**:
  - `README.md` em cada repositório com propósito, tecnologias, passos de execução e deploy, **diagrama da arquitetura específica daquele repositório**, e link do Swagger/Postman (no repo da aplicação).
  - Links dos deploys ativos (endpoint do API Gateway, dashboard do New Relic).
  - **Vídeo de até 15 minutos** — roteiro sugerido: (1) autenticação com CPF via API Gateway, 2 min; (2) pipeline de CI/CD executando a partir de um PR, 3 min; (3) deploy automatizado chegando ao EKS, 2 min; (4) consumo das APIs protegidas, 3 min; (5) dashboard de monitoramento com análise ao vivo sob carga do `k6`, mostrando o HPA escalando, 3 min; (6) logs e traces correlacionados, 2 min.
  - **PDF único** no Portal do Aluno: links dos 4 repositórios, link do vídeo, links das documentações, e confirmação de `soat-architecture` como colaborador nos 4.

---

## Ordem de execução recomendada

A ordem é ditada pelas dependências entre repositórios — infraestrutura de baixo para cima, aplicação por último:

1. **Etapa 0** (validação do Learner Lab, fundação, repositórios, proteção de branches) — destrava todo o resto. A checklist de serviços disponíveis vem **antes** de qualquer linha de Terraform: descobrir um bloqueio depois de duas etapas prontas custa muito mais caro que uma hora de verificação.
2. **Etapa 1** (RDS + migração relacional) — é o trabalho mais longo e mais arriscado da fase, e tudo depende do banco existir. Começar cedo, e manter a suíte de testes verde a cada repositório migrado.
3. **Etapa 3** (EKS) em paralelo com o fim da Etapa 1, já que só depende da VPC.
4. **Etapa 2** (Lambda + API Gateway) — precisa do banco (consulta de cliente) e do cluster (VPC Link).
5. **Etapa 4** (aplicação adaptada) — integra tudo e é o primeiro momento em que o fluxo fim-a-fim roda na nuvem.
6. **Etapa 5** (observabilidade) — instrumentar depois que o comportamento estiver estável, senão os dashboards medem um alvo em movimento.
7. **Etapa 6** (documentação) — escrever com a arquitetura já materializada; as RFCs, porém, devem ser **rascunhadas antes** das decisões que documentam (é o propósito de uma RFC), consolidando-as ao final.
8. **Etapa 7** (pipelines finais, vídeo, PDF) — por último, com tudo funcional.

---

## Riscos e pontos de atenção

| Risco | Impacto | Mitigação |
|---|---|---|
| Migração MongoDB → PostgreSQL maior que o previsto | Atrasa toda a fase | Interfaces de repositório já isolam o Mongo; migrar um agregado por vez com a suíte verde a cada passo; começar por `Cliente`/`Veiculo` (simples) e deixar `OrdemServico` (árvore de 3 níveis) por último, com o aprendizado acumulado |
| Orçamento do Learner Lab (~US$ 50) esgotado pelo EKS | Ambiente derrubado no meio da avaliação, sem recarga | Sem NAT Gateway, `terraform destroy` ao fim de cada sessão, alarme de billing, gravar o vídeo com a infra recém-aplicada |
| Serviço necessário bloqueado no Learner Lab (EKS, SES, VPC endpoints) | Retrabalho de uma etapa inteira | Checklist de validação **no primeiro dia**, antes de escrever Terraform; planos B já definidos (k3s em EC2, SMTP externo) |
| Credenciais do lab expirando no meio de um `terraform apply` | Estado travado no DynamoDB, apply pela metade | Aplicar sempre no início da sessão; `terraform force-unlock` documentado; nunca iniciar apply com menos de 1h de sessão restante |
| Esgotamento de conexões do RDS por rajada de Lambdas | 5xx na autenticação | Pool de 1 conexão, `reserved_concurrency`, monitorar `DatabaseConnections`; RDS Proxy como plano B |
| Estado do Terraform compartilhado entre 4 repos | Apply quebrado por dependência ausente | `terraform_remote_state` com outputs explícitos, ordem de apply documentada no README de cada repo de infra |
| Cold start da Lambda na demonstração | Latência ruim no vídeo | Aquecer antes de gravar; considerar `provisioned_concurrency` apenas se necessário |
| Free tier do New Relic estourado por volume de logs | Perda de observabilidade | Amostragem de logs de nível `debug`, retenção curta, alerta de consumo |

---

## Verificação

- `npm run build` / `npm run type-check` sem erros após a migração de banco.
- `npm run test:coverage` verde contra PostgreSQL via Testcontainers, mantendo os thresholds do `jest.config.js` (≥80%; patamar atual ~97%).
- `docker compose up -d` sobe `app` + `postgres` + `mailhog` saudáveis; smoke test dos endpoints principais e das migrations aplicadas do zero.
- `terraform validate` + `plan` limpos nos três repositórios de infraestrutura; **ciclo completo `apply` → uso → `destroy` → `apply` numa nova sessão do lab**, chegando ao mesmo estado funcional — este é o teste que realmente importa no AWS Academy, e o que garante que o ambiente pode ser reconstruído na hora de gravar o vídeo.
- `scripts/refresh-aws-secrets.sh` executado numa sessão nova deixa as 4 pipelines verdes sem intervenção manual adicional.
- Nenhum recurso órfão após o `destroy`: conferir no console EKS, RDS, EC2 (ENIs e Elastic IPs órfãos são o vazamento clássico) e API Gateway.
- Fluxo fim-a-fim na nuvem: `POST /auth/token` com CPF de um cliente cadastrado devolve JWT; o mesmo token abre uma OS através do API Gateway; CPF inválido/inexistente/inativo devolve 400/404/403.
- `kubectl get hpa -n oficina` mostra métricas reais; teste de carga com `k6` faz o número de réplicas subir e descer.
- Dashboards do New Relic populados com os quatro painéis exigidos; um erro provocado de propósito num use-case de transição de status dispara o alerta correspondente.
- Os 4 repositórios com CI verde, `main`/`homolog` protegidas (push direto rejeitado), `soat-architecture` como colaborador, e README com diagrama próprio.
