#!/usr/bin/env bash
# Smoke do fluxo feliz nos 3 serviços (docker-compose.integration.yml no ar):
#   abrir OS -> diagnóstico (Execution) -> orçamento (Billing) -> aprovar -> pagar (gateway fake +
#   reconciliação) -> reparo (Execution) -> OS FINALIZADA, e a receita aparecendo no dashboard do OS.
# Requer: curl e jq. Falha (exit 1) na primeira etapa que não acontecer em 60 s.
set -euo pipefail

OS=${OS_URL:-http://localhost:3001}
EXEC=${EXEC_URL:-http://localhost:3002}
BILL=${BILL_URL:-http://localhost:3003}
INTERNAL_TOKEN=${INTERNAL_API_TOKEN:-integration-internal-token}
CPF=${SMOKE_CPF:-52998224725}
PLACA=${SMOKE_PLACA:-SMK1A23}

command -v jq >/dev/null || { echo "Erro: jq não encontrado" >&2; exit 1; }
passo() { echo; echo "==> $*"; }
falha() { echo "FALHOU: $*" >&2; exit 1; }

# GET repetido até o filtro jq devolver algo não vazio.
espera() { # url jq-filter auth-header descrição
  for _ in $(seq 1 60); do
    out=$(curl -fsS -H "$3" "$1" 2>/dev/null | jq -r "$2" 2>/dev/null || true)
    [[ -n "$out" && "$out" != "null" ]] && { echo "$out"; return 0; }
    sleep 1
  done
  falha "timeout aguardando: $4"
}
api() { # método url [json]  (usa $AUTH)
  curl -fsS -X "$1" -H "$AUTH" -H 'Content-Type: application/json' ${3:+-d "$3"} "$2"
}

passo "Aguardando os serviços"
for url in "$OS" "$EXEC" "$BILL"; do
  for _ in $(seq 1 90); do curl -fsS "$url/health/live" >/dev/null 2>&1 && break; sleep 1; done
  curl -fsS "$url/health/ready" >/dev/null || falha "$url/health/ready não ficou pronto"
done

passo "Login (admin do seed)"
TOKEN=$(curl -fsS -X POST "$OS/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@oficina.com","senha":"senha123"}' | jq -r '.token // .data.token')
[[ -n "$TOKEN" && "$TOKEN" != null ]] || falha "login sem token"
AUTH="Authorization: Bearer $TOKEN"

passo "Cadastros: serviço do catálogo, cliente e veículo"
SERVICO_ID=$(api POST "$OS/api/servicos" '{"descricao":"Revisão (smoke)","preco":250,"tempoEstimado":60}' | jq -r '.id // .data.id')
CLIENTE_ID=$(api POST "$OS/api/clientes" "{\"nome\":\"Cliente Smoke\",\"cpfCnpj\":\"$CPF\",\"tipo\":\"PESSOA_FISICA\",\"telefone\":\"11999999999\",\"email\":\"smoke@exemplo.com\",\"endereco\":{\"logradouro\":\"Rua A\",\"numero\":\"1\",\"bairro\":\"Centro\",\"cidade\":\"São Paulo\",\"estado\":\"SP\",\"cep\":\"01000000\"}}" 2>/dev/null | jq -r '.id // .data.id' || true)
if [[ -z "$CLIENTE_ID" || "$CLIENTE_ID" == null ]]; then   # já existe (seed ou execução anterior)
  CLIENTE_ID=$(api GET "$OS/api/clientes" | jq -r --arg cpf "$CPF" '(.data // .clientes // .)[] | select(.cpfCnpj==$cpf) | .id' | head -1)
fi
[[ -n "$CLIENTE_ID" ]] || falha "não consegui obter o cliente $CPF"
api POST "$OS/api/veiculos" "{\"clienteId\":\"$CLIENTE_ID\",\"placa\":\"$PLACA\",\"marca\":\"Fiat\",\"modelo\":\"Uno\",\"ano\":2020}" >/dev/null 2>&1 || true

passo "Abrindo a OS"
OS_ID=$(api POST "$OS/api/ordens-servico" "{\"cpfCnpj\":\"$CPF\",\"placa\":\"$PLACA\",\"quilometragemEntrada\":1000}" | jq -r '.id // .data.id')
[[ -n "$OS_ID" && "$OS_ID" != null ]] || falha "OS não criada"
echo "OS $OS_ID"

passo "Execution: a execução entra na fila de diagnóstico"
EXEC_ID=$(espera "$EXEC/api/execucoes/fila?status=AGUARDANDO_DIAGNOSTICO&limit=100" \
  "[.data[] | select(.ordemServicoId==\"$OS_ID\")][0].id" "$AUTH" "execução da OS na fila de diagnóstico")
echo "execução $EXEC_ID"

passo "Mecânico: inicia e conclui o diagnóstico"
api PATCH "$EXEC/api/execucoes/$EXEC_ID/diagnostico/iniciar" >/dev/null
api PATCH "$EXEC/api/execucoes/$EXEC_ID/diagnostico/concluir" \
  "{\"servicos\":[{\"catalogoServicoId\":\"$SERVICO_ID\",\"pecas\":[]}],\"observacoes\":\"smoke\"}" >/dev/null

passo "Billing: orçamento gerado -> cliente aprova"
ORC_ID=$(espera "$BILL/api/orcamentos?ordemServicoId=$OS_ID" '.data.id' "$AUTH" "orçamento da OS")
echo "orçamento $ORC_ID"
api POST "$BILL/api/orcamentos/$ORC_ID/aprovar" >/dev/null

passo "Billing: pagamento solicitado -> comprador paga (gateway fake) -> reconciliação"
PG_ID=$(espera "$BILL/api/orcamentos/$ORC_ID" '.data.pagamento.id' "$AUTH" "pagamento solicitado")
VALOR=$(api GET "$BILL/api/orcamentos/$ORC_ID" | jq -r '.data.valorTotal')
curl -fsS -X POST "$BILL/internal/dev/mercadopago/pagamentos" -H "x-internal-token: $INTERNAL_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"mpPaymentId\":\"smoke-$(date +%s)\",\"status\":\"approved\",\"orcamentoId\":\"$ORC_ID\",\"valor\":$VALOR}" >/dev/null
curl -fsS -X POST "$BILL/internal/pagamentos/$PG_ID/sincronizar" -H "x-internal-token: $INTERNAL_TOKEN" | jq -e '.resultado=="confirmado" or .resultado=="ja-processado"' >/dev/null \
  || falha "pagamento não confirmado"

passo "Execution: o reparo entra na fila -> mecânico inicia e conclui"
espera "$EXEC/api/execucoes/fila?status=AGUARDANDO_REPARO&limit=100" \
  "[.data[] | select(.id==\"$EXEC_ID\")][0].id" "$AUTH" "reparo na fila" >/dev/null
api PATCH "$EXEC/api/execucoes/$EXEC_ID/reparo/iniciar" >/dev/null
api PATCH "$EXEC/api/execucoes/$EXEC_ID/reparo/concluir" '{"observacoes":"smoke ok"}' >/dev/null

passo "OS: FINALIZADA, saga concluída, receita no dashboard"
espera "$OS/api/ordens-servico/$OS_ID" 'select((.data.status // .status)=="FINALIZADA") | "FINALIZADA"' "$AUTH" "OS FINALIZADA" >/dev/null
echo "Histórico da OS:"; api GET "$OS/api/ordens-servico/$OS_ID/historico" | jq -c '.' | head -c 1500; echo
RECEITA=$(api GET "$OS/api/relatorios/dashboard" | jq -r '.data.receitaTotal // .receitaTotal')
[[ "$RECEITA" != null && "$RECEITA" != "" ]] || falha "dashboard sem receitaTotal (Billing indisponível?)"
echo "receitaTotal no dashboard: $RECEITA"

echo; echo "SMOKE OK — OS $OS_ID FINALIZADA pelos 3 serviços."
