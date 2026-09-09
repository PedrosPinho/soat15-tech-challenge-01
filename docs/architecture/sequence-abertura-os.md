# Diagrama de Sequência — Abertura de Ordem de Serviço

Cobre `POST /api/ordens-servico` (`CreateOrdemServicoUseCase`) já com a persistência em
PostgreSQL (Etapa 1) e, na sequência, a primeira transição de status disparando a
notificação assíncrona (`notificarMudancaStatusOS`, inalterado desde a Fase 2 — ver
`ADR-005`).

```mermaid
sequenceDiagram
    actor Interno as Usuário interno
    participant API as API (pod EKS)
    participant UC as CreateOrdemServicoUseCase
    participant ClienteRepo as ClienteRepository (Postgres)
    participant VeiculoRepo as VeiculoRepository (Postgres)
    participant CatalogoRepo as CatalogoServicoRepository (Postgres)
    participant PecaRepo as PecaRepository (Postgres)
    participant DB as RDS PostgreSQL

    Interno->>API: POST /api/ordens-servico { cpfCnpj, placa, catalogoServicos[] }
    API->>UC: execute(dto)
    UC->>ClienteRepo: findByCpfCnpj(cpfCnpj)
    ClienteRepo->>DB: SELECT * FROM clientes WHERE cpf_cnpj = $1
    alt cliente não encontrado
        UC-->>API: 404 NotFoundError
    end
    UC->>VeiculoRepo: findByPlaca(placa)
    VeiculoRepo->>DB: SELECT * FROM veiculos WHERE placa = $1
    alt veículo não encontrado ou não pertence ao cliente
        UC-->>API: 404 / 400
    end
    loop para cada serviço do catálogo informado
        UC->>CatalogoRepo: findById(catalogoServicoId)
        CatalogoRepo->>DB: SELECT * FROM catalogo_servicos WHERE id = $1
        loop para cada peça utilizada
            UC->>PecaRepo: findById(pecaId)
            PecaRepo->>DB: SELECT * FROM pecas WHERE id = $1
        end
    end
    UC->>UC: monta Servico[] (entidade de domínio, imutável)
    UC->>DB: SELECT nextval('numero_os_seq')
    Note right of DB: SEQUENCE nativa do Postgres substitui o<br/>OSCounterModel (coleção-contador do Mongo)
    UC->>UC: OrdemServico.create({ numeroOS, servicos, ... })

    Note over UC,DB: Escrita transacional da árvore de 3 níveis
    UC->>DB: BEGIN
    UC->>DB: INSERT INTO ordens_servico (...)
    UC->>DB: INSERT INTO servicos_os (...) — 1 linha por serviço, com ordem
    UC->>DB: INSERT INTO servico_pecas (...) — 1 linha por peça utilizada, preço histórico
    UC->>DB: COMMIT
    UC-->>API: OrdemServicoResponseDto
    API-->>Interno: 201 Created

    Note over Interno,DB: Mudança de status subsequente (ex.: RECEBIDA → EM_DIAGNOSTICO)
    Interno->>API: PATCH /api/ordens-servico/{id}/status
    API->>DB: UPDATE ordens_servico SET status = $1 (mesma transação de negócio)
    API-->>Interno: 200 OK (resposta não espera a notificação)
    par notificação assíncrona (fire-and-forget)
        API->>API: notificarMudancaStatusOS(os)
        API->>DB: SELECT cliente (e-mail) WHERE id = cliente_id
        API->>SES: enviarAtualizacaoStatus(email, os)
        Note right of SES: falha de notificação é logada<br/>(pino estruturado) e NÃO afeta a resposta HTTP
    end
```

## Pontos de atenção

- **Escrita transacional**: como a entidade `OrdemServico` é imutável e sempre chega inteira ao repositório (`save()`), o `INSERT`/`DELETE`+`INSERT` dos filhos (`servicos_os`, `servico_pecas`) roda dentro de uma única transação — um erro em qualquer INSERT reverte a árvore inteira, evitando o estado parcial que uma escrita multi-tabela não transacional permitiria.
- **`nextval` fora da transação de negócio não é um problema aqui**: `SEQUENCE` do Postgres é não transacional por design (evita lock/serialização entre criações concorrentes de OS) — um `numeroOS` "furado" por causa de um rollback é aceitável e documentado, era o mesmo comportamento do `$inc` atômico do Mongo.
- **Notificação nunca bloqueia a resposta HTTP**: padrão já estabelecido na Fase 2 (`notificarMudancaStatusOS` é fire-and-forget com `.catch` próprio) e mantido na Fase 3 — só a implementação por trás da port `INotificationService` muda (SES no lugar de SMTP/Nodemailer). Ver `ADR-005`.
