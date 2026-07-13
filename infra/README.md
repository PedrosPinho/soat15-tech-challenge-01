# Terraform — cluster kind local

Automatiza, via `terraform apply`, os mesmos passos manuais documentados em
[`../k8s/README.md`](../k8s/README.md): criar o cluster **kind**, buildar e carregar a
imagem da API, e aplicar todos os manifestos de `k8s/`.

## Por que `null_resource` + `local-exec` em vez do provider `kubernetes`?

O enunciado da Fase 2 sugere aplicar os manifestos via provider `kubernetes`. Optamos
por `local-exec` chamando `kubectl`/`kind`/`docker` diretamente porque:

- A única dependência real vira o provider `hashicorp/null` — sem credenciais de cloud,
  sem exigir que o cluster já exista no momento do `terraform plan`.
- Reaproveita literalmente os manifestos de `k8s/` (já escritos e validados na Etapa 3),
  em vez de reescrevê-los em HCL com um provider que costuma exigir o cluster acessível
  já no `plan` para resolver schemas de CRD.

Essa é uma decisão pragmática de projeto de curso, não uma limitação técnica — trocar
por `kubernetes_manifest`/`kubectl_manifest` é uma evolução possível se o projeto for
adiante.

## O que este módulo cria

| Recurso | O que faz |
|---|---|
| `null_resource.kind_cluster` | Cria o cluster kind (`kind create cluster`), se ainda não existir. Destrói o cluster (`kind delete cluster`) no `terraform destroy`. |
| `null_resource.metrics_server` | Instala o `metrics-server` no cluster (necessário para o HPA funcionar), com o patch de TLS inseguro exigido em clusters locais. Desativável via `install_metrics_server = false`. |
| `null_resource.build_image` | `docker build` da imagem da API. Só reconstrói quando `Dockerfile`/`package*.json`/`src/**` mudam (hash em `triggers`). |
| `null_resource.load_image` | `kind load docker-image` — carrega a imagem buildada no cluster kind. |
| `null_resource.namespace` | Aplica `k8s/namespace.yaml`. |
| `null_resource.secret` | Cria/atualiza o Secret `oficina-api-secret` a partir das variáveis sensíveis (`kubectl create secret ... --dry-run=client -o yaml \| kubectl apply -f -`, idempotente). |
| `null_resource.configmap` | Aplica `k8s/configmap.yaml`. |
| `null_resource.mongodb` | Aplica `k8s/mongodb.yaml` (StatefulSet + Service + PVC). |
| `null_resource.mailhog` | Aplica `k8s/mailhog.yaml`. |
| `null_resource.deployment` | Aplica `k8s/deployment.yaml` e roda `kubectl rollout restart` (garante que uma imagem recarregada seja realmente usada pelos pods). |
| `null_resource.service` | Aplica `k8s/service.yaml`. |
| `null_resource.hpa` | Aplica `k8s/hpa.yaml`. |

Nenhum banco de dados gerenciado de cloud é criado — o MongoDB roda dentro do próprio
cluster kind (StatefulSet + PVC via `local-path-provisioner`, que já vem por padrão no
kind).

## Pré-requisitos

- Terraform >= 1.5
- Docker
- [kind](https://kind.sigs.k8s.io/)
- `kubectl`

## Uso

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# edite terraform.tfvars com valores reais (nunca commite esse arquivo)

terraform init
terraform plan
terraform apply
```

## Variáveis

| Nome | Sensível | Padrão | Descrição |
|---|---|---|---|
| `cluster_name` | não | `oficina` | Nome do cluster kind (contexto kubectl: `kind-<nome>`) |
| `image_tag` | não | `oficina-api:local` | Tag da imagem Docker construída e carregada no kind |
| `install_metrics_server` | não | `true` | Instala o `metrics-server` (necessário para o HPA) |
| `mongo_root_username` | não | `admin` | Usuário root do MongoDB |
| `mongo_root_password` | **sim** | — | Senha root do MongoDB |
| `jwt_secret` | **sim** | — | Segredo de assinatura dos JWTs da API |
| `webhook_secret` | **sim** | — | Segredo do header `x-webhook-secret` do endpoint de aprovação de orçamento |
| `smtp_user` | não | `""` | Usuário SMTP (vazio = Mailhog local, sem autenticação) |
| `smtp_pass` | **sim** | `""` | Senha SMTP (vazio = Mailhog local) |

Variáveis marcadas como sensíveis não têm valor padrão — o `terraform plan`/`apply`
falha até que sejam informadas via `terraform.tfvars` ou `TF_VAR_<nome>`.

> **Nota sobre segredos**: o Terraform local grava os valores resolvidos (incluindo os
> sensíveis) em `terraform.tfstate`. Esse arquivo está no `.gitignore` e não deve, em
> hipótese alguma, ser commitado. Para um ambiente compartilhado de verdade, use um
> backend remoto com criptografia (S3+KMS, Terraform Cloud etc.) em vez do backend
> local usado aqui.

## Verificar

```bash
terraform output next_steps
kubectl --context kind-oficina get pods -n oficina
kubectl --context kind-oficina get hpa -n oficina
kubectl --context kind-oficina port-forward svc/oficina-api 3001:3001 -n oficina
curl http://localhost:3001/health
```

## Iterando (rebuild após alterar código)

Basta rodar `terraform apply` de novo: o hash em `local.app_hash` muda sempre que
`Dockerfile`, `package.json`, `package-lock.json` ou qualquer arquivo em `src/` mudam, o
que encadeia `build_image → load_image → deployment` (com `rollout restart`) automaticamente.

## Destruir

```bash
terraform destroy
```

Isso apaga o cluster kind inteiro (`kind delete cluster`), incluindo o PVC do MongoDB —
não há dados a preservar entre execuções em um ambiente de demonstração local.

## Limitação deste ambiente de desenvolvimento

Este módulo foi validado com `terraform fmt`, `terraform init` e `terraform validate`
(reais, com o provider `hashicorp/null` baixado do registry) e um `terraform plan`
completo com variáveis fictícias — os 12 recursos planejam corretamente e o hash de
`app_source_files` é calculado sem erro. Não foi possível rodar `terraform apply` de
ponta a ponta neste ambiente porque `kind`/`kubectl` não estão instalados aqui. Rode o
passo a passo acima na sua máquina antes de gravar o vídeo de demonstração da Fase 2.
