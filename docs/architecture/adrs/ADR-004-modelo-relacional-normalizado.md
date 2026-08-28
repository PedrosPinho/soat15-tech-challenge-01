# ADR-004: Modelo relacional normalizado (por que `servicos_os`/`servico_pecas` em vez de colunas `jsonb`)

**Status**: Aceita
**Data**: 2026-08-28

## Contexto

O documento `ordens-servico` do MongoDB embute o array `servicos`, que embute
`pecasUtilizadas`. Ao migrar para PostgreSQL, existem duas rotas óbvias: (a) manter
essa estrutura como uma ou duas colunas `jsonb` na tabela `ordens_servico`, minimizando
a mudança de forma de acesso aos dados; ou (b) normalizar em tabelas
`servicos_os`/`servico_pecas` com chaves estrangeiras, como qualquer modelo relacional
"de livro-texto".

## Decisão

**Normalizar** em `servicos_os` e `servico_pecas`, com FKs e `ON DELETE CASCADE` para
a tabela pai (ver `data-model.md`).

## Consequências

Positivas:
- Atende ao espírito do requisito do enunciado ("ajustes no modelo relacional, com
  diagramas ER") — um `erDiagram` com uma tabela cheia de `jsonb` seria, na prática,
  ainda um modelo documental disfarçado de relacional.
- `CHECK`/`UNIQUE`/FK reais em `servico_pecas.peca_id` — impossível de expressar como
  constraint de banco dentro de um blob `jsonb`.
- Consultas agregadas (ex.: peça mais usada em serviços, tempo médio de mão de obra por
  categoria de serviço) tornam-se `JOIN`/`GROUP BY` simples, em vez de operadores
  `jsonb` menos legíveis.

Negativas (aceitas conscientemente):
- Leitura da árvore completa da OS exige `JOIN` de 3 níveis (ou queries em lote para
  evitar N+1), reconstituída em memória pelo mapper — mais código de mapeamento do que
  a leitura de um documento único.
- Escrita da OS passa a ser transacional com `DELETE`+`INSERT` dos filhos a cada
  `save()`, já que a entidade de domínio é imutável e sempre chega inteira — mais
  round-trips por escrita do que um `replaceOne` de documento.

## Referências

- `data-model.md`
- `RFC-002-banco-de-dados.md`
