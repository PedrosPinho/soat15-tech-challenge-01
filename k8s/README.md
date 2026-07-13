# Kubernetes — Auto Repair Shop Management System

Manifestos para rodar a API + MongoDB em um cluster local **kind** (Kubernetes-in-Docker).
Todos os recursos vivem no namespace `oficina`.

## Pré-requisitos

- Docker
- [kind](https://kind.sigs.k8s.io/)
- `kubectl`

## Recursos

| Arquivo | O que cria |
|---|---|
| `namespace.yaml` | Namespace `oficina` |
| `configmap.yaml` | Variáveis não sensíveis da API (`oficina-api-config`) |
| `secret.example.yaml` | **Template** do Secret `oficina-api-secret` — não aplicar direto, ver [Secrets](#secrets) |
| `mongodb.yaml` | StatefulSet + Service headless + PVC (2Gi) do MongoDB |
| `mailhog.yaml` | Deployment + Service do Mailhog (SMTP de teste local) |
| `deployment.yaml` | Deployment da API (2 réplicas, probes, resources) |
| `service.yaml` | Service ClusterIP da API (porta 3001) |
| `hpa.yaml` | HorizontalPodAutoscaler (CPU 70% / memória 80%, 2–6 réplicas) |

## Passo a passo

### 1. Criar o cluster (se ainda não existir)

```bash
kind create cluster --name oficina
```

*(Na Etapa 4 isso passa a ser feito via Terraform; localmente o `kind create cluster` manual já é suficiente para testar os manifestos.)*

### 2. Buildar e carregar a imagem da API no kind

O cluster kind não tem acesso a um registry por padrão, então a imagem precisa ser
carregada manualmente:

```bash
docker build -t oficina-api:local .
kind load docker-image oficina-api:local --name oficina
```

Quando o pipeline de CI/CD (Etapa 5) estiver publicando no GHCR, troque a `image:` em
`deployment.yaml` pela tag/digest publicada e use `imagePullSecrets` em vez de carregar
manualmente.

### 3. Criar o namespace e o Secret

```bash
kubectl apply -f k8s/namespace.yaml

kubectl create secret generic oficina-api-secret -n oficina \
  --from-literal=MONGODB_URI="mongodb://admin:SENHA_REAL@mongodb:27017/oficina?authSource=admin" \
  --from-literal=MONGO_ROOT_USERNAME=admin \
  --from-literal=MONGO_ROOT_PASSWORD=SENHA_REAL \
  --from-literal=JWT_SECRET=SEGREDO_REAL \
  --from-literal=WEBHOOK_SECRET=SEGREDO_REAL \
  --from-literal=SMTP_USER="" \
  --from-literal=SMTP_PASS=""
```

Veja [Secrets](#secrets) para a alternativa via YAML.

### 4. Aplicar o restante dos manifestos

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/mailhog.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
```

(`kubectl apply -f k8s/` também funciona — o Kubernetes tolera a ordem de criação e
resolve as referências entre ConfigMap/Secret/Deployment de forma eventual.)

### 5. Verificar

```bash
kubectl get pods -n oficina -w
kubectl get hpa -n oficina
kubectl port-forward svc/oficina-api 3001:3001 -n oficina
curl http://localhost:3001/health
```

## Secrets

**Nunca commite valores reais de secret neste repositório.** `secret.example.yaml` é só
um template (valores `CHANGE_ME`) para documentar as chaves esperadas. Duas formas de
criar o Secret de verdade:

1. **Imperativo (recomendado)** — comando `kubectl create secret generic` do passo 3
   acima, direto do terminal, sem nenhum arquivo em disco.
2. **Declarativo** — copie `secret.example.yaml` para `secret.yaml` (já está no
   `.gitignore` do projeto), preencha os valores reais e rode
   `kubectl apply -f k8s/secret.yaml`.

## Autoscaling (HPA)

O `kind` não vem com o `metrics-server` instalado por padrão, e o HPA depende dele para
ler uso de CPU/memória. Instale com o patch de TLS necessário para clusters locais:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch deployment metrics-server -n kube-system --type=json \
  -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

Depois de alguns minutos, `kubectl top pods -n oficina` e `kubectl get hpa -n oficina`
devem mostrar métricas reais. Para forçar o escalonamento na demo (vídeo da Etapa 6),
gere carga contra a API, por exemplo com `k6` ou `autocannon`:

```bash
npx autocannon -c 50 -d 60 http://localhost:3001/health
```

e acompanhe `kubectl get hpa -n oficina -w`.

## Limpeza

```bash
kubectl delete namespace oficina
kind delete cluster --name oficina
```
