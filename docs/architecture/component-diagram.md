# Diagrama de Componentes — Fase 4 (microsserviços)

> Topologia vigente. A da Fase 3 (monólito atrás de um NLB) ficou em
> [`component-diagram-fase3.md`](component-diagram-fase3.md). Decisões: [`RFC-005`](rfcs/RFC-005-microsservicos-e-saga.md),
> `ADR-008` a `ADR-015`; contratos das mensagens: [`contratos-mensagens.md`](contratos-mensagens.md).

## Visão geral

```mermaid
flowchart LR
  U[Cliente / Atendente / Mecânico] --> APIGW[API Gateway HTTP API]
  MP[(Mercado Pago)] -- "webhook assinado" --> APIGW
  APIGW -- "POST /auth/token" --> LT[Lambda Token]
  APIGW -. authorizer .-> LA[Lambda Authorizer]
  LT -- "GET /internal/clientes/by-cpf" --> ALB
  APIGW -- VPC Link --> ALB[ALB interno<br/>IngressGroup oficina-env]

  subgraph EKS["EKS — namespace oficina-env"]
    ALB -- "/api/ordens-servico, /api/clientes,<br/>/api/veiculos, /api/pecas, /api/servicos,<br/>/api/relatorios, /api/auth" --> OS[OS Service<br/>orquestrador da Saga]
    ALB -- "/api/orcamentos, /api/pagamentos" --> BI[Billing Service]
    ALB -- "/api/execucoes" --> EX[Execution Service]
  end

  OS --> PGOS[(RDS PostgreSQL<br/>oficina_os)]
  BI --> PGBI[(RDS PostgreSQL<br/>oficina_billing)]
  EX --> DDB[(DynamoDB<br/>execucoes)]

  OS -- comandos --> QB[[SQS billing-commands]]
  OS -- comandos --> QE[[SQS execution-commands]]
  QB --> BI
  QE --> EX
  BI -- eventos --> SNS{{SNS oficina-eventos}}
  EX -- eventos --> SNS
  OS -- "eventos de status" --> SNS
  SNS -- "filter policy por type" --> QR[[SQS os-saga-replies]]
  QR --> OS
  BI -- REST --> MP
  OS -- "REST /internal/financeiro/resumo" --> BI

  OS & BI & EX -. "APM + traces + logs" .-> NR[New Relic]
```

- **Um banco por serviço** (ADR-008, ADR-012): `oficina_os` e `oficina_billing` na mesma instância RDS,
  cada um com seu role (`REVOKE CONNECT ... FROM PUBLIC`); `execucoes` no DynamoDB (NoSQL, ADR-011).
  **Nenhum serviço lê o banco de outro** — dados trafegam por mensagens e rotas `/internal/*`.
- **Comunicação síncrona (REST)**: borda → serviços pelo API Gateway; OS → Billing (`receitaTotal` do dashboard,
  com timeout de 2 s e fallback `null`); Lambda de token → OS (`/internal/clientes/by-cpf`, ADR-015); Billing → Mercado Pago.
- **Comunicação assíncrona**: comandos ponto a ponto em SQS, eventos em SNS (fan-out) — ADR-010. Todo envio passa por
  *transactional outbox* e todo consumo por *inbox* idempotente; cada fila tem DLQ (`maxReceiveCount = 5`).
- **Saga orquestrada** no OS Service (ADR-009): [sequência feliz](sequence-saga-feliz.md) e
  [compensações](sequence-saga-compensacao.md).

## Mensageria (por ambiente, prefixo `soat15-tc-<env>-`)

| Recurso | Tipo | Produtor → Consumidor | Dono (Terraform) |
|---|---|---|---|
| `billing-commands` (+ DLQ) | SQS | OS → Billing | Billing |
| `execution-commands` (+ DLQ) | SQS | OS → Execution | Execution |
| `oficina-eventos` | SNS | Billing, Execution e OS publicam | OS |
| `os-saga-replies` (+ DLQ) | SQS inscrita no SNS (raw delivery + filter policy) | → OS | OS |

## Infraestrutura (6 repositórios)

```mermaid
flowchart TB
  subgraph Plataforma
    DB["db-infra<br/>VPC · RDS · SG · senhas dos roles (SSM)"]
    K8S["k8s-infra<br/>EKS t3.medium · LB Controller · nri-bundle · dashboards/alertas"]
    AUTH["auth-lambda<br/>API Gateway · Lambdas · VPC Link → ALB"]
  end
  subgraph Serviços["Serviços (cada um: código + Terraform + k8s/ + CI/CD)"]
    OSR["soat15-tech-challenge-01<br/>OS Service · ECR · SNS · fila de respostas"]
    BIR["billing-service<br/>ECR · billing-commands"]
    EXR["execution-service<br/>ECR · DynamoDB · execution-commands"]
  end
  DB --> K8S --> AUTH
  K8S --> OSR
  OSR -- "terraform_remote_state (tópico SNS)" --> BIR
  OSR -- "terraform_remote_state (tópico SNS)" --> EXR
  OSR -. "Job de bootstrap cria oficina_os e oficina_billing" .-> DB
```

Ordem do primeiro deploy: `db-infra` → `k8s-infra` → **OS Service** → Execution/Billing → `auth-lambda`
(precisa do ALB). Destruição na ordem inversa (cabeçalho dos `destroy.yml`).
