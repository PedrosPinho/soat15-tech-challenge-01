# RFC-003: Estratégia de autenticação (CPF + serverless)

**Status**: Aceita
**Data**: 2026-08-28
**Autor(es)**: Equipe do Tech Challenge

## Contexto

O enunciado exige autenticação serverless por CPF, protegendo rotas sensíveis da
aplicação (em particular `GET /api/ordens-servico/buscar?cpfCnpj=`, hoje pública). A
aplicação já tem um fluxo de login JWT para usuários internos (`POST
/api/auth/login`, e-mail + senha) que deve continuar existindo — a autenticação por CPF
é para **clientes** consultarem/aprovarem suas próprias OS, um público e um caso de uso
diferentes do usuário interno da oficina.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **Lambda de emissão de token + Lambda Authorizer** | Serverless de fato (requisito do enunciado); reaproveita a validação de CPF já existente em `cpf-cnpj.vo.ts`; desacopla autenticação de cliente da aplicação principal | Duplica (ou compartilha via cópia) a lógica de validação de CPF entre repositórios; mais uma peça operacional (Lambda) |
| Amazon Cognito com CPF como atributo customizado | Gerenciado, menos código para manter | **Indisponível no AWS Academy Learner Lab** — eliminado por restrição de ambiente, não por preferência de design |
| Autenticação por CPF dentro da própria API Express (sem Lambda) | Simples, um só serviço | **Não atende ao requisito de "serverless"** do enunciado |
| Login por CPF + senha (em vez de só CPF) | Mais próximo de autenticação tradicional | O enunciado pede autenticação **por CPF**, sem menção a senha para o fluxo de cliente; adicionar senha implicaria gestão de cadastro de senha para clientes, fora do escopo pedido |

## Decisão

Duas Lambdas: uma que recebe o CPF, valida, consulta o cliente no RDS e emite um JWT
(`scope: cliente`); e um Lambda Authorizer (`REQUEST`, cache de 300s) que protege as
rotas `/api/*` no API Gateway, validando esse token (ou o token de usuário interno,
`scope: interno`, emitido pelo fluxo já existente).

**Defesa em profundidade**: o `authMiddleware` da aplicação continua validando a
assinatura do JWT localmente, mesmo com o Authorizer na borda — o Service do EKS nunca
deve confiar cegamente na borda, e o cache de 300s do Authorizer significa que um
cliente desativado pode ter chamadas aceitas pela borda por até 5 minutos após a
emissão do token; a validação local não fecha essa janela (o token em si continua
válido até expirar), mas mantém a aplicação como segunda linha de verificação
independente da configuração do API Gateway.

**Autorização por escopo**: token de cliente só acessa os próprios dados (consulta de
status das próprias OS, aprovação de orçamento); rotas de gestão (peças, catálogo,
relatórios, criação de OS) exigem `scope: interno`. Isso restringe rotas que hoje
aceitam qualquer JWT válido — cada rota protegida ganha um teste de integração
cobrindo a rejeição por escopo incorreto.

## Consequências

- `GET /api/ordens-servico/buscar?cpfCnpj=` deixa de ser pública, passando a exigir
  `scope: cliente`.
- Validação de CPF (`cpf-cnpj.vo.ts`) é copiada para o repositório da Lambda em vez de
  publicada como pacote npm compartilhado — decisão pragmática para o escopo do curso;
  se a duplicação incomodar, extrair um pacote é o caminho natural, ao custo de mais um
  pipeline de publicação.
- Erros de autenticação (`400`/`404`/`403`) nunca diferenciam "não cadastrado" de
  "inativo" na mensagem pública — só no log estruturado, para evitar enumeração de
  CPFs cadastrados.

## Referências

- `sequence-auth.md` — fluxo completo
- `PHASE_3_PLAN.md`, Etapa 2
- `ADR-006` — role compartilhada usada pela Lambda no Learner Lab
