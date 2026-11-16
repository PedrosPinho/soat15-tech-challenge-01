#!/bin/bash
# Cria no LocalStack a mesma topologia de terraform/messaging.tf (+ as filas de
# comando que Billing/Execution criam nos repositórios deles). Executado
# automaticamente pelo LocalStack no estado "ready" (docker-compose.yml).
set -euo pipefail

REGION=us-east-1
TOPIC_ARN=$(awslocal sns create-topic --name oficina-eventos --region "$REGION" --query TopicArn --output text)

create_queue_with_dlq() {
  local name="$1"
  awslocal sqs create-queue --queue-name "${name}-dlq" --region "$REGION" >/dev/null
  local dlq_arn
  dlq_arn=$(awslocal sqs get-queue-attributes --queue-url "http://localhost:4566/000000000000/${name}-dlq" \
    --attribute-names QueueArn --query Attributes.QueueArn --output text)
  awslocal sqs create-queue --queue-name "$name" --region "$REGION" \
    --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${dlq_arn}\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\",\"ReceiveMessageWaitTimeSeconds\":\"20\"}" >/dev/null
}

create_queue_with_dlq execution-commands
create_queue_with_dlq billing-commands
create_queue_with_dlq os-saga-replies

REPLIES_ARN="arn:aws:sqs:${REGION}:000000000000:os-saga-replies"
awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$REPLIES_ARN" \
  --attributes '{
    "RawMessageDelivery": "true",
    "FilterPolicy": "{\"type\":[\"DiagnosticoIniciado\",\"DiagnosticoConcluido\",\"DiagnosticoFalhou\",\"ReparoIniciado\",\"ReparoConcluido\",\"ReparoFalhou\",\"ExecucaoCancelada\",\"OrcamentoGerado\",\"OrcamentoFalhou\",\"OrcamentoAprovado\",\"OrcamentoRecusado\",\"OrcamentoCancelado\",\"PagamentoSolicitado\",\"PagamentoConfirmado\",\"PagamentoRecusado\",\"PagamentoEstornado\",\"EstornoFalhou\"]}"
  }' >/dev/null

echo "LocalStack: topologia da Saga criada"
