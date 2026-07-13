output "cluster_name" {
  description = "Nome do cluster kind criado."
  value       = var.cluster_name
}

output "kube_context" {
  description = "Contexto kubectl apontando para o cluster provisionado."
  value       = local.kube_context
}

output "next_steps" {
  description = "Comandos úteis após o apply."
  value       = <<-EOT
    kubectl --context ${local.kube_context} get pods -n oficina
    kubectl --context ${local.kube_context} get hpa -n oficina
    kubectl --context ${local.kube_context} port-forward svc/oficina-api 3001:3001 -n oficina
  EOT
}
