# ADR-009: Saga orquestrada, com orquestrador no OS Service

**Status**: Aceita
**Data**: 2026-11-11

## Contexto

O fluxo *abrir OS → diagnóstico → orçamento → aprovação → pagamento →
execução* atravessa três serviços e três bancos, sem transação ACID possível.
O enunciado exige Saga com rollback/compensação em qualquer etapa e a
justificativa da escolha (orquestrada vs. coreografada) no README.

## Decisão

**Saga orquestrada.** O OS Service hospeda o orquestrador:

- máquina de estados declarativa (`src/application/saga/ciclo-os.saga.ts`):
  cada passo define comando, eventos de sucesso/falha e compensação;
- estado persistido em `saga_instancias` (com `versao` para lock otimista) e
  trilha em `saga_passos_log`; criada na **mesma transação** que cria a OS;
- compensação em **ordem inversa** a partir do último passo concluído; cada
  compensação é idempotente e retentável; sem convergir ⇒ `FALHA_COMPENSACAO`
  + alerta + runbook manual;
- timeouts nos passos de espera (aprovação e pagamento) por *sweeper*;
- participantes (Billing, Execution) **não conhecem o fluxo**: recebem
  comandos, respondem com um evento de sucesso ou falha.

Tabela de passos/compensações em `PHASE_4_PLAN.md` ("A Saga Ciclo da OS").

## Consequências

- (+) Fluxo e compensações em um só lugar: legível, auditável, testável com BDD
  usando mensageria em memória; consulta direta "em que passo está a OS X?".
- (+) Demonstração clara no vídeo (histórico de passos + compensações).
- (−) O OS Service conhece todos os passos (acoplamento lógico) e é ponto
  crítico — mitigado por persistência, lock otimista e sweeper.
- (−) Coreografia seria menos acoplada, mas espalharia o rollback em três
  repositórios e dificultaria provar a correção das compensações.
