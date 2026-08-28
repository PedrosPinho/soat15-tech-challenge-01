# Diagrama de Sequência — Autenticação por CPF

Fluxo completo: emissão do token a partir do CPF e uso do token numa chamada
protegida da API. Ver decisão em [`rfcs/RFC-003-autenticacao.md`](rfcs/RFC-003-autenticacao.md).

```mermaid
sequenceDiagram
    actor Cliente
    participant APIGW as API Gateway
    participant TokenFn as Lambda POST /auth/token
    participant SSM as SSM Parameter Store
    participant RDS as RDS PostgreSQL
    participant AuthzFn as Lambda Authorizer
    participant EKS as API (pod no EKS)

    Note over Cliente,RDS: 1. Emissão do token
    Cliente->>APIGW: POST /auth/token { cpf }
    APIGW->>TokenFn: invoca (integração direta)
    TokenFn->>TokenFn: valida dígitos verificadores do CPF
    alt CPF com formato inválido
        TokenFn-->>Cliente: 400 CPF inválido
    else CPF válido
        TokenFn->>SSM: lê credenciais do RDS (cacheado entre invocações)
        TokenFn->>RDS: SELECT id, nome, ativo FROM clientes WHERE cpf_cnpj = $1
        alt cliente não encontrado
            TokenFn-->>Cliente: 404 cliente não cadastrado
        else cliente inativo
            TokenFn-->>Cliente: 403 cliente inativo
        else cliente ativo
            TokenFn->>SSM: lê JWT_SECRET
            TokenFn->>TokenFn: assina JWT (sub, cpf, scope=cliente, exp curto)
            TokenFn-->>Cliente: 200 { token }
        end
    end

    Note over Cliente,EKS: 2. Chamada protegida com o token
    Cliente->>APIGW: GET /api/ordens-servico/buscar?cpfCnpj=... (Authorization: Bearer token)
    APIGW->>AuthzFn: invoca authorizer (REQUEST, cache 300s por token)
    AuthzFn->>AuthzFn: valida assinatura, expiração, scope
    alt token inválido ou expirado
        AuthzFn-->>Cliente: 401 (negado pelo API Gateway)
    else token válido
        AuthzFn-->>APIGW: Allow + contexto (clienteId, cpf)
        APIGW->>EKS: proxy via VPC Link/NLB, headers com clienteId/cpf
        EKS->>EKS: authMiddleware valida o JWT de novo (defesa em profundidade)
        EKS->>EKS: valida scope=cliente (só acessa dados do próprio cliente)
        EKS-->>Cliente: 200 { ordensServico }
    end
```

## Pontos de atenção

- **Nunca diferenciar 404 (não cadastrado) de 403 (inativo) por mensagem pública** — evita enumeração de CPFs cadastrados. A diferenciação existe só no log estruturado (`correlationId`).
- **O `authMiddleware` da aplicação não confia apenas no Lambda Authorizer**: valida a assinatura do JWT de novo, localmente, antes de qualquer lógica de negócio — ver `RFC-003` para a justificativa completa.
- **Cache do Authorizer (300s)**: um token revogado (ex.: cliente desativado depois de emitido o token) pode continuar válido pela borda até o cache expirar; a validação de `ativo` acontece só na emissão. Risco aceito e documentado — o token já tem expiração curta.
