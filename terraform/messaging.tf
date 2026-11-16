# Mensageria da Saga (ADR-010). O OS é dono do tópico de eventos e da fila de
# respostas; Billing e Execution são donos das próprias filas de comando e
# assinam/publicam neste tópico (consumindo estas saídas por terraform_remote_state).

resource "aws_sns_topic" "eventos" {
  name = "${local.name_prefix}-oficina-eventos"
}

resource "aws_sqs_queue" "saga_replies_dlq" {
  name                      = "${local.name_prefix}-os-saga-replies-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "saga_replies" {
  name                       = "${local.name_prefix}-os-saga-replies"
  message_retention_seconds  = var.message_retention_seconds
  visibility_timeout_seconds = var.visibility_timeout_seconds
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.saga_replies_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })
}

# Permite que o SNS entregue na fila (somente a partir deste tópico).
resource "aws_sqs_queue_policy" "saga_replies" {
  queue_url = aws_sqs_queue.saga_replies.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSnsToSend"
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.saga_replies.arn
      Condition = { ArnEquals = { "aws:SourceArn" = aws_sns_topic.eventos.arn } }
    }]
  })
}

# Raw delivery: o corpo da mensagem SQS é o próprio envelope (sem o invólucro do SNS).
resource "aws_sns_topic_subscription" "saga_replies" {
  topic_arn            = aws_sns_topic.eventos.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.saga_replies.arn
  raw_message_delivery = true

  filter_policy       = jsonencode({ type = local.saga_reply_types })
  filter_policy_scope = "MessageAttributes"

  depends_on = [aws_sqs_queue_policy.saga_replies]
}
