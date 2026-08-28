# Kubernetes — Auto Repair Shop Management System

Manifestos da API para o cluster EKS provisionado por
[`soat15-tech-challenge-k8s-infra`](https://github.com/PedrosPinho/soat15-tech-challenge-k8s-infra).
Ficam versionados **aqui** (repositório da aplicação), não no repo de infra — é quem
mais muda (nova env var, novo probe) a cada feature, e o repo de infra os aplica só
por referência (ver `ADR-003`). Também servem para testar localmente num cluster
[kind](https://kind.sigs.k8s.io/) descartável.

## Recursos

| Arquivo | O que cria |
|---|---|
| `namespace.yaml` | Namespace `oficina` |
| `configmap.yaml` | Variáveis não sensíveis da API (`oficina-api-config`) |
| `secret.example.yaml` | **Template** do Secret `oficina-api-secret` — nunca aplicar direto, ver [Secrets](#secrets) |
| `deployment.yaml` | Deployment da API (2 réplicas, probes `/health/live`+`/health/ready`, resources) |
| `service.yaml` | Service `LoadBalancer` (NLB interno) — alvo do VPC Link do API Gateway |
| `hpa.yaml` | HorizontalPodAutoscaler (CPU 70% / memória 80%, 2–6 réplicas) |
| `job-migrate.yaml` | `Job` de `npm run db:migrate`, aplicado pelo CI/CD antes do rollout |

## Deploy real (EKS, via CI/CD)

`.github/workflows/ci-cd.yml` aplica estes manifestos a cada push em `main`/`homolog`
depois que os testes passam e a imagem é publicada no ECR: `namespace` → `Job` de
migration (`npm run db:migrate` contra o RDS) → Secret (montado em tempo de deploy a
partir do SSM Parameter Store, nunca versionado) → `configmap`/`deployment` (com a tag
do ECR = SHA do commit) → `service`/`hpa` → `kubectl rollout status` → smoke test
`/health/ready`. Homolog e produção compartilham o mesmo cluster, separados por
namespace (`oficina-homolog`/`oficina-prod` — o pipeline troca `namespace: oficina`
por `sed` antes de aplicar; os arquivos aqui usam `oficina` como placeholder).

## Uso local (kind, sem cloud)

Útil para testar mudança de manifesto sem depender de sessão do Learner Lab.

```bash
kind create cluster --name oficina
docker build -t oficina-api:local .
kind load docker-image oficina-api:local --name oficina

kubectl apply -f k8s/namespace.yaml
kubectl create secret generic oficina-api-secret -n oficina \
  --from-literal=DATABASE_URL="postgres://oficina:senha123@host.docker.internal:5432/oficina" \
  --from-literal=JWT_SECRET=change-this-in-production \
  --from-literal=WEBHOOK_SECRET=change-this-in-production

kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
```

`type: LoadBalancer` nunca sai de `pending` no kind (não há cloud controller) — use
`kubectl port-forward` para acessar:

```bash
kubectl get pods -n oficina -w
kubectl port-forward svc/oficina-api 3001:3001 -n oficina
curl http://localhost:3001/health
```

## Secrets

**Nunca commite valores reais de secret neste repositório.** `secret.example.yaml` é só
um template (valores `CHANGE_ME`) para documentar as chaves esperadas — `DATABASE_URL`,
`JWT_SECRET`, `WEBHOOK_SECRET`. No EKS real, o CI/CD monta o Secret a partir do SSM
Parameter Store a cada deploy (nunca em arquivo). Localmente, use o comando imperativo
acima ou copie o template para `k8s/secret.yaml` (já no `.gitignore`) e preencha valores
reais.

## Autoscaling (HPA)

No EKS, o `metrics-server` é instalado como addon pelo Terraform de `k8s-infra`. No
kind local, instale manualmente:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch deployment metrics-server -n kube-system --type=json \
  -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

Depois de alguns minutos, `kubectl top pods -n oficina` e `kubectl get hpa -n oficina`
devem mostrar métricas reais. Para forçar o escalonamento na demo (vídeo de entrega),
gere carga contra a API com `k6` ou `autocannon` e acompanhe `kubectl get hpa -n oficina -w`.

## Limpeza (kind)

```bash
kubectl delete namespace oficina
kind delete cluster --name oficina
```
