# ADR-015: Lambda de autenticação consulta o cliente via HTTP, não via banco

**Status**: Aceita
**Data**: 2026-11-11

## Contexto

Na Fase 3, a Lambda `POST /auth/token` valida o CPF consultando a tabela
`clientes` **diretamente no RDS**, com security group próprio. Na Fase 4 a
tabela `clientes` pertence ao OS Service, e o enunciado proíbe qualquer
serviço de acessar o banco de outro.

## Decisão

A Lambda deixa de usar `pg`/RDS e chama `GET /internal/clientes/by-cpf/:cpf`
do OS Service pelo ALB interno, autenticada por `x-internal-token` (segredo em
SSM, gerado no Terraform do OS Service). Respostas mantêm o contrato público
atual (200/400/403/404, sem distinguir "não existe" de "inativo" no corpo).
Remove-se a regra Lambda→RDS do security group (`db-infra`).

## Consequências

- (+) Fronteira de dados respeitada; Lambda mais simples (sem pool/conexões ao RDS — resolve o risco de esgotamento de conexões da Fase 3).
- (−) Nova dependência de runtime: se o OS Service estiver fora, a emissão de
  token falha (503). Aceitável — sem OS Service nada mais funciona de qualquer forma.
- (−) Latência extra de um salto HTTP; mitigada por timeout curto e reaproveitamento de conexão.
- A Lambda precisa estar na VPC para alcançar o ALB interno (já está).
