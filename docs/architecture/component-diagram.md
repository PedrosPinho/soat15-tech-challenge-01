# Diagrama de Componentes — Fase 3 (Cloud)

> Visão de implantação em nuvem. Para o desenho de camadas do código (DDD), ver o
> diagrama existente no [`README.md`](../../README.md). Este documento cobre a
> topologia de infraestrutura descrita em [`PHASE_3_PLAN.md`](../PHASE_3_PLAN.md).

## Visão geral

```mermaid
flowchart TB
    Client([Cliente / Usuário interno])

    subgraph AWS["AWS (conta AWS Academy Learner Lab, us-east-1)"]
        subgraph Edge["Borda"]
            APIGW[API Gateway HTTP API]
            AuthzLambda[Lambda Authorizer]
            TokenLambda["Lambda — POST /auth/token"]
        end

        subgraph VPC["VPC"]
            subgraph Public["Subnets públicas"]
                NLB[Network Load Balancer interno]
            end

            subgraph Private["Subnets privadas"]
                subgraph EKS["EKS — namespace oficina"]
                    Pod1[Pod API réplica 1]
                    Pod2[Pod API réplica 2]
                    HPA[HorizontalPodAutoscaler]
                end
                RDS[(RDS PostgreSQL 16)]
                TokenLambda -.consulta cliente.-> RDS
            end
        end

        ECR[(ECR — imagem da API)]
        SSM[[SSM Parameter Store — segredos]]
        SES[SES / SMTP externo]
        NewRelic[New Relic — APM, infra, logs, alertas]
    end

    Client -->|HTTPS| APIGW
    APIGW -->|POST /auth/token| TokenLambda
    APIGW -->|"/api/* (protegido)"| AuthzLambda
    AuthzLambda -.valida JWT.-> APIGW
    APIGW -->|VPC Link| NLB
    NLB --> Pod1
    NLB --> Pod2
    HPA -.escala.-> Pod1
    HPA -.escala.-> Pod2
    Pod1 --> RDS
    Pod2 --> RDS
    Pod1 -.envia e-mail.-> SES
    Pod2 -.envia e-mail.-> SES
    EKS -.pull de imagem.-> ECR
    Pod1 -.lê segredos no apply.-> SSM
    TokenLambda -.lê segredos.-> SSM
    Pod1 -.métricas/logs/traces.-> NewRelic
    Pod2 -.métricas/logs/traces.-> NewRelic
    EKS -.métricas de cluster.-> NewRelic
```

## Componentes e responsabilidade

| Componente | Responsabilidade | Repositório |
|---|---|---|
| API Gateway (HTTP API) | Borda pública, roteamento, throttling, integração com Lambdas e VPC Link | `soat15-tech-challenge-auth-lambda` |
| Lambda `POST /auth/token` | Valida CPF, consulta cliente no RDS, emite JWT com `scope: cliente` | `soat15-tech-challenge-auth-lambda` |
| Lambda Authorizer | Valida JWT (assinatura, expiração, situação do cliente) para rotas `/api/*` | `soat15-tech-challenge-auth-lambda` |
| NLB interno | Alvo do VPC Link, expõe o `Service` do EKS só dentro da VPC | `soat15-tech-challenge-k8s-infra` |
| EKS + HPA | Roda a API principal (Node.js/Express), escala por CPU | `soat15-tech-challenge-k8s-infra` (cluster) / este repo (manifestos e imagem) |
| RDS PostgreSQL 16 | Persistência relacional (clientes, veículos, OS, peças, pagamentos, usuários) | `soat15-tech-challenge-db-infra` |
| SSM Parameter Store | Segredos (`SecureString`): credenciais do RDS, `JWT_SECRET` | `soat15-tech-challenge-db-infra` (parâmetros do banco) / `auth-lambda` (JWT) |
| ECR | Registro da imagem Docker da API | `soat15-tech-challenge-k8s-infra` |
| SES / SMTP externo | Implementação de `INotificationService` (e-mail de mudança de status de OS) | este repo (`SesNotificationService`) |
| New Relic | APM, métricas de infraestrutura K8s, logs correlacionados, dashboards e alertas | este repo (agente) + `k8s-infra` (Helm `nri-bundle`) |

## Notas de desenho

- **API Gateway não fala diretamente com pods**: passa por VPC Link → NLB interno, porque o cluster fica em subnets privadas sem exposição pública direta.
- **Sem NAT Gateway** (restrição de orçamento do Learner Lab): a Lambda de autenticação só precisa alcançar o RDS (dentro da VPC) e o SSM (via *Interface VPC Endpoint*, se necessário); os nós do EKS ficam em subnets públicas com security group restrito para poder alcançar o ECR/SSM sem NAT. Ver `ADR-006` para a decisão de segurança associada (`LabRole` compartilhada).
- **Duas linhas de defesa de autenticação**: o Lambda Authorizer valida na borda, e o `authMiddleware` da aplicação valida de novo a assinatura do JWT — o Service do EKS nunca confia cegamente na borda.
