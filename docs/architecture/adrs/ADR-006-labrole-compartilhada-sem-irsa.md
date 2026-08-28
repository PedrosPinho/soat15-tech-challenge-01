# ADR-006: Uso da `LabRole` compartilhada em vez de IRSA

**Status**: Aceita
**Data**: 2026-08-28

## Contexto

Numa conta AWS comercial, a prática correta para dar permissões a pods de um cluster
EKS é IRSA (IAM Roles for Service Accounts): cada `ServiceAccount` do Kubernetes recebe
sua própria role, com permissões mínimas para o que aquele workload especificamente
precisa. IRSA depende de criar um **OIDC identity provider** para o cluster
(`iam:CreateOpenIDConnectProvider`) e de criar roles dedicadas por serviço
(`iam:CreateRole`).

O **AWS Academy Learner Lab bloqueia IAM**: não é possível criar usuários, roles,
policies ou identity providers. A única identidade disponível é a role pré-criada
**`LabRole`**, e a permissão `iam:PassRole` para ela é o que o Learner Lab efetivamente
concede.

## Decisão

Usar a `LabRole` compartilhada em **tudo**: execução das Lambdas, node group do EKS,
instâncias EC2. Sem IRSA — os pods herdam as permissões da `LabRole` através do
instance profile dos nós, via IMDS (Instance Metadata Service).

## Consequências

**Esta é uma concessão de segurança deliberada, não um descuido.** Consequência
direta e aceita: **todo pod do cluster passa a ter as permissões amplas da `LabRole`**,
não apenas as que o workload específico precisa — um pod da API teria, na prática,
acesso às mesmas permissões AWS que a Lambda de autenticação ou o node group, violando
o princípio de menor privilégio.

Mitigações parciais dentro do que o Learner Lab permite:
- Security groups continuam restringindo tráfego de rede por porta/origem
  independentemente de IAM (RDS só aceita 5432 dos SGs do EKS e da Lambda, por exemplo).
- Nenhum segredo sensível além do necessário é colocado em variável de ambiente/SSM
  acessível pelos pods além do que a aplicação já precisa (string de conexão do banco,
  `JWT_SECRET`) — a superfície de risco da `LabRole` ampla fica, na prática, limitada
  pelo que efetivamente está acessível na rede e nos parâmetros, não eliminada.

**O que se faria numa conta real** (registrado para referência, não implementado
aqui): habilitar o OIDC provider do cluster EKS, criar uma role dedicada por
`ServiceAccount` via IRSA, com policy de permissão mínima por workload (ex.: a API só
precisaria de acesso de leitura a um parâmetro SSM específico, não a toda a `LabRole`).

## Referências

- `PHASE_3_PLAN.md`, seção "Restrições do AWS Academy Learner Lab"
- `RFC-001-escolha-da-nuvem.md`
