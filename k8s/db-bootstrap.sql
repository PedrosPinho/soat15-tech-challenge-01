-- Bootstrap IDEMPOTENTE dos databases e roles por serviço na instância RDS compartilhada
-- (Fase 4, ADR-012). Executado como Job do Kubernetes (k8s/job-db-bootstrap.yaml) pelo
-- pipeline do OS Service, ANTES da migration, com a senha master do SSM — o runner do
-- GitHub não alcança o RDS (subnet privada). Pode rodar a cada deploy.
--
--   psql -v ON_ERROR_STOP=1 -v os_password=... -v billing_password=... -f db-bootstrap.sql
--
-- Resultado:
--   oficina_os      dono: os_service       (OS Service)
--   oficina_billing dono: billing_service  (Billing Service)
--   REVOKE CONNECT ... FROM PUBLIC em todos: cada role só conecta no próprio database
--   (psql como billing_service em oficina_os => "permission denied for database").
-- O Execution Service usa DynamoDB e não aparece aqui.
\set ON_ERROR_STOP on

-- 1) Roles: cria se não existe; a senha é sempre sincronizada com o SSM.
SELECT 'CREATE ROLE os_service LOGIN'
 WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'os_service') \gexec
SELECT 'CREATE ROLE billing_service LOGIN'
 WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'billing_service') \gexec
SELECT format('ALTER ROLE os_service WITH LOGIN PASSWORD %L', :'os_password') \gexec
SELECT format('ALTER ROLE billing_service WITH LOGIN PASSWORD %L', :'billing_password') \gexec

-- 2) O master precisa ser membro do role para criar o database com OWNER dele (RDS não dá superuser).
GRANT os_service TO CURRENT_USER;
GRANT billing_service TO CURRENT_USER;

-- 3) Databases (CREATE DATABASE não roda em transação: \gexec executa cada comando isolado).
SELECT 'CREATE DATABASE oficina_os OWNER os_service'
 WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'oficina_os') \gexec
SELECT 'CREATE DATABASE oficina_billing OWNER billing_service'
 WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'oficina_billing') \gexec

-- 4) Isolamento: ninguém conecta por herança do PUBLIC. Inclui o database legado `oficina`
--    (Fase 3), para os roles de serviço não alcançarem dados antigos.
REVOKE ALL ON DATABASE oficina FROM PUBLIC;
REVOKE ALL ON DATABASE oficina_os FROM PUBLIC;
REVOKE ALL ON DATABASE oficina_billing FROM PUBLIC;
GRANT CONNECT ON DATABASE oficina_os TO os_service;
GRANT CONNECT ON DATABASE oficina_billing TO billing_service;
