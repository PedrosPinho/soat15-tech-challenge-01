variable "cluster_name" {
  description = "Nome do cluster kind. Também define o contexto kubectl: kind-<nome>."
  type        = string
  default     = "oficina"
}

variable "image_tag" {
  description = "Tag da imagem Docker da API a construir e carregar no kind."
  type        = string
  default     = "oficina-api:local"
}

variable "install_metrics_server" {
  description = "Instala o metrics-server no cluster (necessário para o HPA funcionar em kind)."
  type        = bool
  default     = true
}

variable "mongo_root_username" {
  description = "Usuário root do MongoDB."
  type        = string
  default     = "admin"
}

variable "mongo_root_password" {
  description = "Senha root do MongoDB."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Segredo usado para assinar os JWTs da API."
  type        = string
  sensitive   = true
}

variable "webhook_secret" {
  description = "Segredo esperado no header x-webhook-secret do endpoint de aprovação de orçamento."
  type        = string
  sensitive   = true
}

variable "smtp_user" {
  description = "Usuário SMTP (deixe vazio para usar o Mailhog local, sem autenticação)."
  type        = string
  default     = ""
}

variable "smtp_pass" {
  description = "Senha SMTP (deixe vazia para usar o Mailhog local, sem autenticação)."
  type        = string
  sensitive   = true
  default     = ""
}
