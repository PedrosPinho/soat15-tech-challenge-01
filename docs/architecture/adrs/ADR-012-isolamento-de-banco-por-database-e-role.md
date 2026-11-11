# ADR-012: Isolamento de banco por database + role na mesma instância RDS

**Status**: Aceita
**Data**: 2026-11-11

## Contexto

"Cada microsserviço com banco próprio" e "nenhum serviço acessa o banco de
outro". Duas instâncias RDS (uma por serviço SQL) dobrariam o custo e o tempo
de `apply` no Learner Lab.

## Decisão

Uma instância RDS (provisionada em `db-infra`, inalterada), com um **database**
e um **role** por serviço:

| Serviço | Database | Role |
|---|---|---|
| OS | `oficina_os` | `os_service` |
| Billing | `oficina_billing` | `billing_service` |

- Cada role é dono apenas do próprio database; `REVOKE CONNECT ON DATABASE … FROM PUBLIC`.
- Senhas dos roles geradas no Terraform e guardadas no SSM (`SecureString`);
  a senha master só é usada pelo Job de bootstrap idempotente do pipeline.
- A aplicação **nunca** usa o usuário master.
- Critério de verificação: `psql` como `billing_service` no `oficina_os` ⇒ `permission denied`.

## Consequências

- (+) Isolamento lógico verificável sem custo extra.
- (−) Isolamento **não é físico**: instância, CPU, I/O e a janela de
  manutenção são compartilhados — um serviço "barulhento" afeta o outro.
  Numa conta real, instâncias (ou clusters Aurora) separadas por serviço.
- (−) A Lambda de autenticação deixa de ler o RDS ([`ADR-015`](ADR-015-lambda-de-auth-via-http.md)), o que remove uma regra de security group.
