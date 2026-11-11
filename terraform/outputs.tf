output "ecr_repository_url" {
  description = "URL do repositório ECR do OS Service"
  value       = aws_ecr_repository.os_service.repository_url
}

output "events_topic_arn" {
  description = "ARN do tópico SNS oficina-eventos (Billing e Execution publicam e assinam aqui)"
  value       = aws_sns_topic.eventos.arn
}

output "saga_replies_queue_url" {
  description = "URL da fila os-saga-replies (consumida pelo OS)"
  value       = aws_sqs_queue.saga_replies.url
}

output "saga_replies_queue_arn" {
  description = "ARN da fila os-saga-replies"
  value       = aws_sqs_queue.saga_replies.arn
}

output "saga_replies_dlq_url" {
  description = "URL da DLQ de os-saga-replies"
  value       = aws_sqs_queue.saga_replies_dlq.url
}
