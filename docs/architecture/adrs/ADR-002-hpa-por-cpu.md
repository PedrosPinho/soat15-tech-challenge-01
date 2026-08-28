# ADR-002: HPA por CPU (limiares e por que não KEDA/métricas customizadas)

**Status**: Aceita
**Data**: 2026-08-28

## Contexto

O enunciado exige cluster Kubernetes "com escalabilidade". O `k8s/hpa.yaml` já escrito
na Fase 2 usa `autoscaling/v2` com escala por CPU, mas só era validado estaticamente
(sem cluster real, sem `metrics-server`). Na Fase 3, com EKS real, é preciso decidir se
esse desenho por CPU é mantido ou se vale trocar por algo mais sofisticado (KEDA,
métricas de negócio customizadas via New Relic).

## Decisão

Manter **HPA por CPU** (`autoscaling/v2`), agora sobre métricas reais coletadas pelo
`metrics-server` instalado como addon do EKS. Não introduzir KEDA nem métricas
customizadas para escalonamento nesta fase.

## Consequências

- CPU é uma métrica direta, sem dependência de um scaler externo (KEDA) ou de latência
  de ingestão de métricas de negócio — decisão adequada para uma API HTTP
  razoavelmente CPU-bound, sem filas a drenar.
- O comportamento é demonstrável com `k6` gerando carga e observando réplicas subirem
  e descerem, sem depender de infraestrutura extra além do que já existe.
- Se o volume real de tráfego revelar que CPU não é um bom proxy de carga (ex.: I/O de
  banco vira o gargalo antes da CPU saturar), a métrica de escalonamento precisaria ser
  revisitada — risco aceito, não crítico para o escopo do curso.
- KEDA/métricas customizadas ficam registrados como evolução futura, não como decisão
  tomada.

## Referências

- `k8s/hpa.yaml`
- `PHASE_3_PLAN.md`, Etapa 3
