# ADR-005: Notificações via SES por trás da port existente

**Status**: Aceita
**Data**: 2026-08-28

## Contexto

A Fase 2 introduziu a port `INotificationService` (`src/domain/services/`) e a
implementação `NodemailerNotificationService` (SMTP/Mailhog), desenhada
especificamente para permitir trocar o mecanismo de envio sem tocar nos use-cases. A
Fase 3 pede notificações "serverless". O AWS Academy Learner Lab pode ter SES
restrito ou em modo sandbox (só envia para endereços verificados) — risco identificado
antes de decidir.

## Decisão

Nova implementação `SesNotificationService` da mesma port `INotificationService`,
selecionada por variável de ambiente. `NodemailerNotificationService` permanece como
implementação de desenvolvimento local (Mailhog via `docker-compose.yml`) — a port foi
desenhada exatamente para essa troca na Fase 2, e não há motivo para descartá-la.

**Plano de contingência caso SES esteja bloqueado ou apenas em sandbox restrito**:
manter `NodemailerNotificationService` apontando para um SMTP externo em produção,
atrás da mesma port. O requisito "notificações serverless" fica atendido no *desenho*
(a port permite plugar um mecanismo serverless) e a limitação de ambiente é documentada
como tal, não escondida.

## Consequências

- Nenhuma mudança nos 6 use-cases de transição de status nem em
  `notificar-mudanca-status.helper.ts` além da instrumentação de observabilidade já
  prevista em `RFC-004` — a troca de mecanismo de envio é inteiramente confinada à
  infraestrutura.
- Validação de disponibilidade do SES precisa acontecer cedo (primeiro dia de trabalho
  com a conta AWS Academy), antes de a Etapa 4 do plano assumir que SES está
  disponível.
- Em modo sandbox do SES, a demonstração em vídeo fica limitada a 2-3 endereços
  verificados — suficiente para o objetivo do curso, mas documentado como limitação de
  ambiente, não de arquitetura.

## Referências

- `src/domain/services/` (port `INotificationService`)
- `PHASE_3_PLAN.md`, seção "Restrições do AWS Academy Learner Lab" e Etapa 4
