#!/usr/bin/env bash
# Branch protection de `main` e `homolog` nos 3 serviços (T8.4): PR obrigatório e os status
# checks `Build`, `Test` e `Sonar` (nomes dos jobs de cada ci-cd.yml) precisam passar.
#
# Uso:  ./scripts/protect-branches.sh [--dry-run]
# Requer: `gh` autenticado com permissão de admin nos repositórios. Idempotente (PUT).
# Repositórios de infra (db-infra, k8s-infra, auth-lambda) já têm a proteção da Fase 3 e usam
# outros checks — não são tocados aqui.
set -euo pipefail

REPOS=(
  "PedrosPinho/soat15-tech-challenge-01"
  "PedrosPinho/soat15-tech-challenge-billing-service"
  "PedrosPinho/soat15-tech-challenge-execution-service"
)
BRANCHES=(main homolog)
CHECKS='["Build","Test","Sonar"]'

DRY_RUN=false
case "${1:-}" in
  --dry-run) DRY_RUN=true ;;
  "") ;;
  *) echo "Uso: $0 [--dry-run]" >&2; exit 2 ;;
esac

BODY=$(cat <<JSON
{
  "required_status_checks": { "strict": true, "contexts": $CHECKS },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0, "dismiss_stale_reviews": true },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
)

for repo in "${REPOS[@]}"; do
  for branch in "${BRANCHES[@]}"; do
    if [[ "$DRY_RUN" == true ]]; then
      echo "[dry-run] PUT repos/$repo/branches/$branch/protection  checks=$CHECKS"
      continue
    fi
    command -v gh >/dev/null || { echo "Erro: gh CLI não encontrado." >&2; exit 1; }
    echo "Protegendo $repo@$branch..."
    gh api -X PUT "repos/$repo/branches/$branch/protection" --input - <<<"$BODY" >/dev/null
  done
done
echo "Pronto."
