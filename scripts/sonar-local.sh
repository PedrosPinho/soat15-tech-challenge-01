#!/usr/bin/env bash
# Sobe o SonarQube local (se preciso), roda os testes com cobertura e analisa os 3 serviços.
# Pré-requisitos: docker (+ compose), curl, jq, e os repos billing/execution clonados ao lado.
#   ./scripts/sonar-local.sh                # os 3 serviços
#   ./scripts/sonar-local.sh os             # só um: os | billing | execution
#   SKIP_TESTS=1 ./scripts/sonar-local.sh   # reaproveita coverage/lcov.info já gerado
set -euo pipefail

SONAR_URL="${SONAR_HOST_URL:-http://localhost:9000}"
ADMIN_PASSWORD="${SONAR_ADMIN_PASSWORD:-Sonar-Local-123!}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
declare -A REPOS=(
  [os]="$RAIZ"
  [billing]="$RAIZ/../soat15-tech-challenge-billing-service"
  [execution]="$RAIZ/../soat15-tech-challenge-execution-service"
)
ALVOS=("${@:-os billing execution}")
[[ $# -eq 0 ]] && ALVOS=(os billing execution)

passo() { printf '\n==> %s\n' "$*"; }
falha() { echo "FALHOU: $*" >&2; exit 1; }

passo "SonarQube em $SONAR_URL"
if ! curl -fsS "$SONAR_URL/api/system/status" >/dev/null 2>&1; then
  docker compose -f "$RAIZ/docker-compose.sonar.yml" up -d
fi
for _ in $(seq 1 120); do
  [[ "$(curl -fsS "$SONAR_URL/api/system/status" 2>/dev/null | jq -r .status 2>/dev/null)" == UP ]] && break
  sleep 3
done
[[ "$(curl -fsS "$SONAR_URL/api/system/status" | jq -r .status)" == UP ]] || falha "SonarQube não subiu (docker logs)"

passo "Credenciais (troca a senha padrão admin/admin na primeira vez)"
if curl -fsS -u "admin:admin" "$SONAR_URL/api/authentication/validate" 2>/dev/null | jq -e .valid >/dev/null 2>&1; then
  curl -fsS -u admin:admin -X POST "$SONAR_URL/api/users/change_password" \
    --data-urlencode login=admin --data-urlencode previousPassword=admin \
    --data-urlencode "password=$ADMIN_PASSWORD" >/dev/null
fi
AUTH=(-u "admin:$ADMIN_PASSWORD")
curl -fsS "${AUTH[@]}" "$SONAR_URL/api/authentication/validate" | jq -e .valid >/dev/null \
  || falha "login admin recusado (defina SONAR_ADMIN_PASSWORD com a senha atual)"
curl -fsS "${AUTH[@]}" -X POST "$SONAR_URL/api/user_tokens/revoke" --data-urlencode name=sonar-local >/dev/null 2>&1 || true
TOKEN=$(curl -fsS "${AUTH[@]}" -X POST "$SONAR_URL/api/user_tokens/generate" \
  --data-urlencode name=sonar-local | jq -r .token)
[[ -n "$TOKEN" && "$TOKEN" != null ]] || falha "não gerou token"

RESULTADO=0
for alvo in "${ALVOS[@]}"; do
  dir="${REPOS[$alvo]:-}"
  [[ -n "$dir" && -d "$dir" ]] || falha "alvo desconhecido ou repo ausente: $alvo"
  dir="$(cd "$dir" && pwd)"
  passo "[$alvo] testes com cobertura"
  if [[ "${SKIP_TESTS:-0}" != 1 ]]; then
    (cd "$dir" && npm run test:coverage -- --silent) || echo "AVISO: testes falharam em $alvo; seguindo com o lcov gerado" >&2
  fi
  [[ -f "$dir/coverage/lcov.info" ]] || falha "[$alvo] coverage/lcov.info ausente"
  passo "[$alvo] análise Sonar + quality gate"
  if docker run --rm --network host \
      -e SONAR_HOST_URL="$SONAR_URL" -e SONAR_TOKEN="$TOKEN" \
      -v "$dir:/usr/src" sonarsource/sonar-scanner-cli \
      -Dsonar.qualitygate.wait=true; then
    echo "[$alvo] quality gate: OK"
  else
    echo "[$alvo] quality gate REPROVADO ou análise falhou (veja $SONAR_URL/dashboard?id=$(basename "$dir"))" >&2
    RESULTADO=1
  fi
done
passo "Painel: $SONAR_URL (usuário admin)"
exit $RESULTADO
