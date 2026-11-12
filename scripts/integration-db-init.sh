#!/bin/bash
# Init do Postgres do compose de integração: roda o MESMO bootstrap do Job de produção
# (k8s/db-bootstrap.sql), criando oficina_os/oficina_billing e os roles com senhas de dev.
set -euo pipefail
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v os_password=os-dev-pass -v billing_password=billing-dev-pass \
  -f /sql/db-bootstrap.sql
