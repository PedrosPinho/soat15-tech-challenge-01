# Provisiona um cluster kind local e aplica os manifestos de k8s/.
#
# Decisão de projeto: em vez dos providers `kubernetes`/`kubectl` do Terraform,
# usamos `null_resource` + `local-exec` chamando kind/kubectl/docker diretamente.
# Isso mantém a única dependência real como o provider `null` (sem credenciais de
# cloud, sem exigir que o cluster já exista no momento do `terraform plan`) e
# reaproveita, literalmente, os mesmos manifestos já escritos e validados na
# Etapa 3 (k8s/), em vez de reescrevê-los em HCL. Ver docs/PHASE_2_TASKS.md.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

locals {
  kube_context = "kind-${var.cluster_name}"
  k8s_dir      = "${path.module}/../k8s"

  # Hash usado nos triggers para só reconstruir/recarregar/reiniciar a API quando o
  # código-fonte ou o Dockerfile realmente mudarem entre um `terraform apply` e outro.
  app_source_files = concat(
    [
      "${path.module}/../Dockerfile",
      "${path.module}/../package.json",
      "${path.module}/../package-lock.json",
    ],
    [for f in fileset("${path.module}/../src", "**") : "${path.module}/../src/${f}"],
  )
  app_hash = sha1(join("", [for f in local.app_source_files : filesha1(f)]))
}

resource "null_resource" "kind_cluster" {
  triggers = {
    cluster_name = var.cluster_name
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      if ! kind get clusters | grep -qx "${var.cluster_name}"; then
        kind create cluster --name "${var.cluster_name}"
      else
        echo "Cluster kind '${var.cluster_name}' já existe, reaproveitando."
      fi
    EOT
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = ["bash", "-c"]
    command     = "kind delete cluster --name \"${self.triggers.cluster_name}\" || true"
  }
}

resource "null_resource" "metrics_server" {
  count      = var.install_metrics_server ? 1 : 0
  depends_on = [null_resource.kind_cluster]

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      kubectl --context "${local.kube_context}" apply -f \
        https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
      kubectl --context "${local.kube_context}" patch deployment metrics-server -n kube-system --type=json \
        -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]' \
        || true
    EOT
  }
}

resource "null_resource" "build_image" {
  triggers = {
    app_hash = local.app_hash
  }

  provisioner "local-exec" {
    command = "docker build -t ${var.image_tag} ${path.module}/.."
  }
}

resource "null_resource" "load_image" {
  depends_on = [null_resource.kind_cluster, null_resource.build_image]

  triggers = {
    app_hash = local.app_hash
  }

  provisioner "local-exec" {
    command = "kind load docker-image ${var.image_tag} --name ${var.cluster_name}"
  }
}

resource "null_resource" "namespace" {
  depends_on = [null_resource.kind_cluster]

  # Sem isso, editar namespace.yaml não recria o null_resource, e um `terraform apply`
  # seguinte não reaplicaria o arquivo — mesma classe de bug do probe do mongodb.yaml
  # (fix editado no arquivo, nunca reaplicado ao pod já existente).
  triggers = {
    manifest_hash = filesha1("${local.k8s_dir}/namespace.yaml")
  }

  provisioner "local-exec" {
    command = "kubectl --context ${local.kube_context} apply -f ${local.k8s_dir}/namespace.yaml"
  }
}

resource "null_resource" "secret" {
  depends_on = [null_resource.namespace]

  triggers = {
    mongo_root_username = var.mongo_root_username
    mongo_root_password = var.mongo_root_password
    jwt_secret          = var.jwt_secret
    webhook_secret      = var.webhook_secret
    smtp_user           = var.smtp_user
    smtp_pass           = var.smtp_pass
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      kubectl --context "${local.kube_context}" create secret generic oficina-api-secret -n oficina \
        --from-literal=MONGODB_URI="mongodb://${var.mongo_root_username}:${var.mongo_root_password}@mongodb:27017/oficina?authSource=admin" \
        --from-literal=MONGO_ROOT_USERNAME="${var.mongo_root_username}" \
        --from-literal=MONGO_ROOT_PASSWORD="${var.mongo_root_password}" \
        --from-literal=JWT_SECRET="${var.jwt_secret}" \
        --from-literal=WEBHOOK_SECRET="${var.webhook_secret}" \
        --from-literal=SMTP_USER="${var.smtp_user}" \
        --from-literal=SMTP_PASS="${var.smtp_pass}" \
        --dry-run=client -o yaml | kubectl --context "${local.kube_context}" apply -f -
    EOT
  }
}

resource "null_resource" "configmap" {
  depends_on = [null_resource.namespace]

  triggers = {
    manifest_hash = filesha1("${local.k8s_dir}/configmap.yaml")
  }

  provisioner "local-exec" {
    command = "kubectl --context ${local.kube_context} apply -f ${local.k8s_dir}/configmap.yaml"
  }
}

resource "null_resource" "mongodb" {
  depends_on = [null_resource.secret, null_resource.configmap]

  triggers = {
    manifest_hash = filesha1("${local.k8s_dir}/mongodb.yaml")
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      kubectl --context "${local.kube_context}" apply -f ${local.k8s_dir}/mongodb.yaml
      # Bloqueia até o pod ficar Ready — sem isso, `apply` "sucesso" não garante que o
      # Mongo esteja de pé, e o oficina-api sobe em CrashLoopBackOff tentando conectar
      # (visto ao vivo: readinessProbe com timeout curto demais deixava o StatefulSet
      # preso em 0/1 indefinidamente e ninguém percebia até checar os pods manualmente).
      kubectl --context "${local.kube_context}" rollout status statefulset/mongodb -n oficina --timeout=180s
    EOT
  }
}

resource "null_resource" "mailhog" {
  depends_on = [null_resource.namespace]

  triggers = {
    manifest_hash = filesha1("${local.k8s_dir}/mailhog.yaml")
  }

  provisioner "local-exec" {
    command = "kubectl --context ${local.kube_context} apply -f ${local.k8s_dir}/mailhog.yaml"
  }
}

resource "null_resource" "deployment" {
  depends_on = [
    null_resource.load_image,
    null_resource.configmap,
    null_resource.secret,
    null_resource.mongodb,
    null_resource.mailhog,
  ]

  triggers = {
    app_hash      = local.app_hash
    manifest_hash = filesha1("${local.k8s_dir}/deployment.yaml")
  }

  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      kubectl --context "${local.kube_context}" apply -f ${local.k8s_dir}/deployment.yaml
      kubectl --context "${local.kube_context}" rollout restart deployment/oficina-api -n oficina
      # Sem isso, `apply` "sucesso" não garante pods saudáveis — só que o manifesto foi
      # aceito pelo API server. Falha aqui (timeout) é o sinal de que algo (ex.: Mongo
      # não pronto, secret errado) está impedindo os pods de subir.
      kubectl --context "${local.kube_context}" rollout status deployment/oficina-api -n oficina --timeout=180s
    EOT
  }
}

resource "null_resource" "service" {
  depends_on = [null_resource.deployment]

  triggers = {
    manifest_hash = filesha1("${local.k8s_dir}/service.yaml")
  }

  provisioner "local-exec" {
    command = "kubectl --context ${local.kube_context} apply -f ${local.k8s_dir}/service.yaml"
  }
}

resource "null_resource" "hpa" {
  depends_on = [null_resource.deployment]

  triggers = {
    manifest_hash = filesha1("${local.k8s_dir}/hpa.yaml")
  }

  provisioner "local-exec" {
    command = "kubectl --context ${local.kube_context} apply -f ${local.k8s_dir}/hpa.yaml"
  }
}
