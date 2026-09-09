#!/usr/bin/env bash
# Publica as credenciais temporárias da sessão atual do AWS Academy Learner Lab
# como GitHub Secrets nos 4 repositórios da Fase 3, de uma vez.
#
# Por quê: o Learner Lab não permite OIDC (IAM bloqueado, sem
# iam:CreateOpenIDConnectProvider), então o CI/CD dos 4 repositórios usa
# credenciais estáticas de sessão (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/
# AWS_SESSION_TOKEN) — e essas expiram com a sessão (~4h). Rode este script no
# início de cada sessão de trabalho, antes de qualquer `terraform apply` ou push
# que dispare uma pipeline. Se a primeira pipeline do dia falhar com
# ExpiredToken/UnrecognizedClientException, é isso — rode de novo e reexecute.
#
# Uso:
#   1. Copie as credenciais do Learner Lab (AWS Details > AWS CLI) para
#      ~/.aws/credentials (perfil default) OU exporte AWS_ACCESS_KEY_ID/
#      AWS_SECRET_ACCESS_KEY/AWS_SESSION_TOKEN no shell antes de rodar.
#   2. ./scripts/refresh-aws-secrets.sh
#
# Requer: AWS CLI autenticado (perfil default ou env vars) e `gh` autenticado
# com permissão de admin nos 4 repositórios.

set -euo pipefail

REPOS=(
  "PedrosPinho/soat15-tech-challenge-01"
  "PedrosPinho/soat15-tech-challenge-db-infra"
  "PedrosPinho/soat15-tech-challenge-k8s-infra"
  "PedrosPinho/soat15-tech-challenge-auth-lambda"
)

command -v aws >/dev/null || { echo "Erro: aws CLI não encontrado no PATH." >&2; exit 1; }
command -v gh >/dev/null || { echo "Erro: gh CLI não encontrado no PATH." >&2; exit 1; }

# Preferência: env vars já exportadas nesta sessão; senão, cai para o profile
# default do AWS CLI (~/.aws/credentials).
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-$(aws configure get aws_access_key_id || true)}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-$(aws configure get aws_secret_access_key || true)}"
AWS_SESSION_TOKEN="${AWS_SESSION_TOKEN:-$(aws configure get aws_session_token || true)}"

if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" || -z "${AWS_SESSION_TOKEN:-}" ]]; then
  echo "Erro: AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_SESSION_TOKEN incompletos." >&2
  echo "Cole as credenciais do Learner Lab (AWS Details > AWS CLI) em ~/.aws/credentials" >&2
  echo "ou exporte as 3 variáveis no shell antes de rodar este script." >&2
  exit 1
fi

echo "Validando credenciais..."
if ! CALLER=$(AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
              AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
              AWS_SESSION_TOKEN="$AWS_SESSION_TOKEN" \
              aws sts get-caller-identity --output text 2>&1); then
  echo "Erro: credenciais inválidas ou expiradas." >&2
  echo "$CALLER" >&2
  echo "Copie credenciais novas do Learner Lab e tente de novo." >&2
  exit 1
fi
echo "OK — sessão válida: $CALLER"

for repo in "${REPOS[@]}"; do
  echo "Atualizando secrets em $repo..."
  gh secret set AWS_ACCESS_KEY_ID --repo "$repo" --body "$AWS_ACCESS_KEY_ID"
  gh secret set AWS_SECRET_ACCESS_KEY --repo "$repo" --body "$AWS_SECRET_ACCESS_KEY"
  gh secret set AWS_SESSION_TOKEN --repo "$repo" --body "$AWS_SESSION_TOKEN"
done

echo "Pronto — credenciais atualizadas nos 4 repositórios."
echo "Lembrete: expiram com a sessão do Learner Lab (~4h). Rode de novo na próxima sessão."
