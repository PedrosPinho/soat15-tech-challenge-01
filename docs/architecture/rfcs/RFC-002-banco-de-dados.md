# RFC-002: Escolha do banco de dados gerenciado

**Status**: Aceita
**Data**: 2026-08-28
**Autor(es)**: Equipe do Tech Challenge

## Contexto

A Fase 1/2 usa MongoDB/Mongoose, com a coleção `ordens-servico` embutindo o array
`servicos`, que por sua vez embute `pecasUtilizadas` — um modelo documental que reflete
bem a árvore de agregação DDD (`OrdemServico` como raiz). O enunciado da Fase 3 exige
explicitamente "ajustes no modelo relacional, com diagramas ER e explicação dos
relacionamentos" e um banco de dados **gerenciado relacional**. Isso descarta manter o
modelo documental (DocumentDB/MongoDB Atlas não atenderiam ao pedido de modelo
relacional, mesmo sendo gerenciados).

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| **Amazon RDS for PostgreSQL 16** | SQL padrão, tipos ricos (enums nativos, `CHECK`, índice GIN para busca textual), `SEQUENCE` nativa substitui o contador manual do Mongo, ecossistema maduro de migrations | Nenhuma desvantagem relevante para o escopo do curso |
| Amazon Aurora Serverless v2 | Escala automaticamente para zero/cima, menos operação manual | Custo mais alto e menos previsível; complexidade adicional não justificada pelo volume do projeto |
| RDS for MySQL | Também atende ao requisito relacional | Sem ganho sobre PostgreSQL para este caso; PostgreSQL tem melhor suporte a `CHECK` complexos, tipos enum nativos e busca textual (`tsvector`), usados no modelo (ver `data-model.md`) |
| DocumentDB (compatível com MongoDB) | Migração de código quase nula | **Não atende ao requisito do enunciado** de modelo relacional com ER — descartado de saída |

## Decisão

**Amazon RDS for PostgreSQL 16.** Atende ao requisito relacional do enunciado, tem os
recursos de tipo/constraint necessários para expressar as invariantes que hoje vivem só
no código de domínio (ver `data-model.md`, seção "Índices e invariantes"), e é a opção
de menor custo/complexidade operacional dentro do orçamento do Learner Lab.

O que se ganha saindo do MongoDB:
- Invariantes reforçadas no banco (`CHECK`, `UNIQUE`, índice único parcial), não só na
  camada de domínio.
- Transações multi-tabela nativas (`BEGIN`/`COMMIT`) para a escrita da árvore
  `ordens_servico` → `servicos_os` → `servico_pecas`, sem depender de transações
  multi-documento do Mongo (disponíveis, mas mais caras de usar corretamente).
- Consultas ad-hoc/relatórios mais simples de expressar em SQL do que em agregation
  pipeline.

O que se perde:
- Um `save()` de agregado deixa de ser uma escrita de documento único e passa a ser uma
  transação com `DELETE`+`INSERT` dos filhos (mais round-trips, mitigado por rodar
  dentro de uma única transação).
- Leitura da árvore completa da OS deixa de ser um `findOne` e passa a exigir `JOIN`
  (ou queries em lote para evitar N+1) recompostos em memória pelo mapper.
- Perda de flexibilidade de schema — mudanças no formato de `servicos`/`pecasUtilizadas`
  agora exigem migration versionada, não só mudança no schema Mongoose.

## Consequências

- Toda a camada `src/infrastructure/database/mongodb/` é substituída por
  `src/infrastructure/database/postgres/`, mas as interfaces de
  `src/domain/repositories/` não mudam — o blast radius fica confinado à
  infraestrutura e ao composition root (`src/main/factories/`).
- Migração feita agregado por agregado, do mais simples (`Cliente`/`Veiculo`) ao mais
  complexo (`OrdemServico`), com a suíte de testes verde a cada passo — ver
  `PHASE_3_PLAN.md`, Etapa 1.3 e seção de riscos.
- Testes de infraestrutura trocam `mongodb-memory-server` por Testcontainers
  PostgreSQL.

## Referências

- `data-model.md` — modelo ER completo e justificativa de cada relacionamento
- `ADR-004` — por que tabelas normalizadas (`servicos_os`/`servico_pecas`) em vez de
  colunas `jsonb`
- `PHASE_3_PLAN.md`, Etapa 1
