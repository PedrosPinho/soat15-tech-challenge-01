# Domain Model — Auto Repair Shop Management System

## Overview

This document provides comprehensive specifications for all 21 domain entities, their attributes, operations, relationships, and validation rules.

## Entity Catalog

### 1. Cliente (Customer)

**Context**: Atendimento, Financeiro (Shared Kernel)

**Purpose**: Represents individuals or companies that own vehicles and request repair services.

**Attributes**:
- `id`: UUID (primary key)
- `nome`: string (required, 3-100 chars)
- `cpfCnpj`: string (required, unique, validated format)
- `tipo`: enum ["PESSOA_FISICA", "PESSOA_JURIDICA"]
- `telefone`: string (required, phone format)
- `email`: string (required, email format)
- `endereco`: embedded object
  - `logradouro`: string
  - `numero`: string
  - `complemento`: string (optional)
  - `bairro`: string
  - `cidade`: string
  - `estado`: string (2 chars)
  - `cep`: string (8 digits)
- `dataCadastro`: DateTime (auto-set)
- `ativo`: boolean (default: true)

**Operations**:
- `agendarAtendimento(data, hora, tipoServico)`: Creates Agendamento
- `consultarHistorico()`: Returns service history
- `atualizarContato(telefone, email)`: Updates contact info
- `desativar()`: Soft delete

**Business Rules**:
- CPF must be valid (11 digits, checksum algorithm)
- CNPJ must be valid (14 digits, checksum algorithm)
- Email must be unique across active customers
- Cannot delete customer with pending service orders

**Relationships**:
- Has many `Agendamento` (1:*)
- Has many `Veiculo` (1:*)
- Generates many `Pagamento` (1:*) - via OS chain

---

### 2. Agendamento (Appointment)

**Context**: Atendimento

**Purpose**: Schedules customer service appointments and tracks confirmation status.

**Attributes**:
- `id`: UUID (primary key)
- `clienteId`: UUID (foreign key, required)
- `veiculoId`: UUID (foreign key, optional initially)
- `dataHora`: DateTime (required, future date)
- `tipoServico`: enum ["REVISAO", "MANUTENCAO", "REPARO", "DIAGNOSTICO"]
- `status`: enum ["AGENDADO", "CONFIRMADO", "CANCELADO", "CONCLUIDO"]
- `observacoes`: string (optional, max 500 chars)
- `criadoEm`: DateTime (auto-set)
- `atualizadoEm`: DateTime (auto-update)

**Operations**:
- `confirmar()`: Sets status to CONFIRMADO
- `cancelar(motivo)`: Sets status to CANCELADO
- `reagendar(novaDataHora)`: Updates date/time, resets to AGENDADO
- `concluir()`: Sets status to CONCLUIDO

**Business Rules**:
- Cannot schedule in the past
- Cannot have multiple active appointments for same vehicle at same time
- Must confirm within 24 hours before scheduled time
- Cancellation must occur at least 2 hours before appointment

**Relationships**:
- Belongs to `Cliente` (*:1)
- References `Veiculo` (*:0..1) - can be set later

---

### 3. Veiculo (Vehicle)

**Context**: Atendimento

**Purpose**: Stores vehicle information and service history.

**Attributes**:
- `id`: UUID (primary key)
- `clienteId`: UUID (foreign key, required)
- `placa`: string (required, unique, 7 chars, format ABC-1234 or ABC1D23)
- `marca`: string (required, 2-50 chars)
- `modelo`: string (required, 2-100 chars)
- `ano`: integer (required, 1900-current year)
- `cor`: string (optional)
- `quilometragem`: integer (optional, >= 0)
- `chassi`: string (optional, unique if provided)
- `renavam`: string (optional)
- `observacoes`: string (optional, max 1000 chars)
- `criadoEm`: DateTime (auto-set)
- `atualizadoEm`: DateTime (auto-update)

**Operations**:
- `atualizarQuilometragem(km)`: Updates mileage
- `consultarHistorico()`: Returns service history
- `verificarManutencoesPendentes()`: Checks due maintenance

**Business Rules**:
- Placa must be unique and valid Brazilian format
- Ano cannot be future year
- Quilometragem can only increase
- Chassi must be unique if provided

**Relationships**:
- Belongs to `Cliente` (*:1)
- Has many `Diagnostico` (1:*)
- Has many `Agendamento` (1:*)

---

### 4. Diagnostico (Diagnostic)

**Context**: Diagnóstico

**Purpose**: Technical inspection process to identify vehicle issues.

**Attributes**:
- `id`: UUID (primary key)
- `veiculoId`: UUID (foreign key, required)
- `mecanicoId`: UUID (foreign key, required)
- `quilometragemAtual`: integer (required, >= 0)
- `status`: enum ["INICIADO", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"]
- `observacoes`: string (optional, max 2000 chars)
- `dataInicio`: DateTime (auto-set on start)
- `dataConclusao`: DateTime (set on completion)
- `tempoEstimado`: integer (minutes, optional)
- `tempoReal`: integer (minutes, calculated)

**Operations**:
- `iniciar()`: Sets status to INICIADO
- `identificarProblema(descricao, gravidade, sistema)`: Creates Problema
- `concluir()`: Sets status to CONCLUIDO, calculates tempo real
- `cancelar(motivo)`: Sets status to CANCELADO

**Business Rules**:
- Must have vehicle received in workshop
- Only one diagnostic per vehicle at a time
- Must identify at least one problem before completion
- Mechanic must have appropriate specialization

**Relationships**:
- Belongs to `Veiculo` (*:1)
- Assigned to `Mecânico` (*:1)
- Identifies many `Problema` (1:*)
- Generates one `Orçamento` (1:1)

---

### 5. Problema (Problem)

**Context**: Diagnóstico

**Purpose**: Classifies identified vehicle defects and issues.

**Attributes**:
- `id`: UUID (primary key)
- `diagnosticoId`: UUID (foreign key, required)
- `descricao`: string (required, 10-500 chars)
- `gravidade`: enum ["BAIXA", "MEDIA", "ALTA", "CRITICA"]
- `sistema`: enum ["MOTOR", "TRANSMISSAO", "SUSPENSAO", "FREIOS", "ELETRICA", "CARROCERIA", "OUTROS"]
- `requerManutencaoImediata`: boolean (default: false)
- `pecasNecessarias`: array of string (optional)
- `tempoEstimadoReparo`: integer (minutes, optional)

**Operations**:
- `classificarGravidade()`: Auto-classifies based on system + keywords
- `estimarCusto()`: Provides rough cost estimate

**Business Rules**:
- CRITICA gravity forces requerManutencaoImediata = true
- System FREIOS automatically elevates to at least MEDIA
- Description must be specific and actionable

**Relationships**:
- Belongs to `Diagnostico` (*:1)
- Referenced by `ItemOrcamento` (*:*)

---

### 6. Mecânico (Mechanic)

**Context**: Diagnóstico, Execução

**Purpose**: Workshop staff member performing diagnostics and repairs.

**Attributes**:
- `id`: UUID (primary key)
- `nome`: string (required, 3-100 chars)
- `cpf`: string (required, unique, 11 digits)
- `especialidades`: array of enum ["MOTOR", "TRANSMISSAO", "SUSPENSAO", "FREIOS", "ELETRICA", "GERAL"]
- `nivelExperiencia`: enum ["JUNIOR", "PLENO", "SENIOR"]
- `telefone`: string (required)
- `email`: string (optional)
- `ativo`: boolean (default: true)
- `dataAdmissao`: DateTime (required)
- `dataDemissao`: DateTime (optional)

**Operations**:
- `atribuirDiagnostico(diagnosticoId)`: Assigns diagnostic task
- `atribuirServico(servicoId)`: Assigns service task
- `consultarServicosAtivos()`: Returns current workload
- `registrarEspecialidade(especialidade)`: Adds new skill

**Business Rules**:
- Must have at least one specialization
- Cannot be assigned work outside specializations
- Cannot have more than 3 active services simultaneously
- SENIOR mechanics can review JUNIOR/PLENO work

**Relationships**:
- Performs many `Diagnostico` (1:*)
- Executes many `Servico` (1:*)

---

### 7. Orçamento (Quote/Estimate)

**Context**: Orçamento

**Purpose**: Detailed pricing for services and parts requiring customer approval.

**Attributes**:
- `id`: UUID (primary key)
- `diagnosticoId`: UUID (foreign key, required)
- `veiculoId`: UUID (foreign key, required)
- `clienteId`: UUID (foreign key, required)
- `valorTotal`: decimal (calculated, 2 decimal places)
- `valorPecas`: decimal (calculated, 2 decimal places)
- `valorMaoObra`: decimal (calculated, 2 decimal places)
- `status`: enum ["GERADO", "ENVIADO", "APROVADO", "REJEITADO", "EXPIRADO"]
- `dataGeracao`: DateTime (auto-set)
- `dataValidade`: DateTime (default: 30 days from generation)
- `observacoes`: string (optional, max 1000 chars)
- `condicoespagamento`: string (optional)

**Operations**:
- `adicionarItem(descricao, quantidade, valorUnitario, tipo)`: Adds ItemOrcamento
- `calcularTotal()`: Sums all items
- `enviar()`: Sets status to ENVIADO, notifies customer
- `aprovar()`: Sets status to APROVADO (triggers OS creation)
- `rejeitar(motivo)`: Sets status to REJEITADO
- `verificarValidade()`: Checks if expired

**Business Rules**:
- Must have at least one item
- Auto-expires after validity date
- Cannot modify after ENVIADO status
- Values must be > 0
- Total = sum(valorPecas) + sum(valorMaoObra)

**Relationships**:
- Belongs to `Diagnostico` (*:1)
- References `Veiculo` (*:1)
- References `Cliente` (*:1)
- Contains many `ItemOrcamento` (1:*)
- Requires one `Aprovacao` (1:1)

---

### 8. ItemOrcamento (Quote Item)

**Context**: Orçamento

**Purpose**: Line item in quote detailing specific service or part.

**Attributes**:
- `id`: UUID (primary key)
- `orcamentoId`: UUID (foreign key, required)
- `tipo`: enum ["PECA", "MAO_DE_OBRA", "SERVICO"]
- `descricao`: string (required, 5-200 chars)
- `quantidade`: decimal (required, > 0)
- `valorUnitario`: decimal (required, >= 0, 2 decimal places)
- `valorTotal`: decimal (calculated: quantidade * valorUnitario)
- `pecaId`: UUID (foreign key, optional - for PECA type)
- `tempoEstimado`: integer (minutes, for MAO_DE_OBRA)

**Operations**:
- `calcularValorTotal()`: quantidade * valorUnitario
- `atualizarQuantidade(novaQuantidade)`: Recalculates total

**Business Rules**:
- PECA type must reference valid Peca
- MAO_DE_OBRA must have tempoEstimado
- Quantidade must be positive
- Parent Orçamento must not be APROVADO/REJEITADO for modifications

**Relationships**:
- Belongs to `Orçamento` (*:1)
- References `Peca` (*:0..1) - only for PECA type

---

### 9. Aprovacao (Approval)

**Context**: Orçamento

**Purpose**: Formal customer authorization record for quote.

**Attributes**:
- `id`: UUID (primary key)
- `orcamentoId`: UUID (foreign key, required, unique)
- `aprovado`: boolean (required)
- `dataAprovacao`: DateTime (auto-set)
- `motivoRejeicao`: string (optional, required if aprovado = false)
- `assinaturaCliente`: string (optional - digital signature hash)
- `ip`: string (optional - for audit)

**Operations**:
- `aprovar()`: Sets aprovado = true
- `rejeitar(motivo)`: Sets aprovado = false, stores reason

**Business Rules**:
- One approval per quote
- Cannot change approval decision once set
- Rejection must include reason
- Approval triggers OS creation

**Relationships**:
- Belongs to `Orçamento` (1:1)
- Creates `OrdemServico` (1:1) if approved

---

### 10. OrdemServico (Service Order)

**Context**: Execução

**Purpose**: Master record coordinating all repair activities for approved quote.

**Attributes**:
- `id`: UUID (primary key)
- `numeroOS`: string (unique, auto-generated, format: OS-YYYYMMDD-####)
- `aprovacaoId`: UUID (foreign key, required)
- `veiculoId`: UUID (foreign key, required)
- `clienteId`: UUID (foreign key, required)
- `status`: enum ["ABERTA", "EM_ANDAMENTO", "AGUARDANDO_PECAS", "AGUARDANDO_APROVACAO", "CONCLUIDA", "CANCELADA"]
- `prioridade`: enum ["BAIXA", "NORMAL", "ALTA", "URGENTE"]
- `dataAbertura`: DateTime (auto-set)
- `dataInicio`: DateTime (set when first service starts)
- `dataConclusao`: DateTime (set when all services complete)
- `observacoes`: string (optional, max 2000 chars)
- `quilometragemEntrada`: integer (required, >= 0)
- `quilometragemSaida`: integer (set on delivery, >= entrada)

**Operations**:
- `iniciar()`: Sets status to EM_ANDAMENTO
- `adicionarServico(descricao, mecanicoId, pecas)`: Creates Servico
- `solicitarAutorizacaoAdicional(descricao, valor)`: Creates AutorizacaoAdicional
- `aguardarPecas()`: Sets status to AGUARDANDO_PECAS
- `concluir()`: Sets status to CONCLUIDA, validates all services done
- `cancelar(motivo)`: Sets status to CANCELADA
- `notificarCliente(mensagem)`: Sends status update

**Business Rules**:
- Can only be created from approved Orçamento
- All Servicos must be CONCLUIDO before OS can be CONCLUIDA
- Cannot cancel if any payment received
- URGENTE priority requires manager approval
- Must test vehicle before marking CONCLUIDA

**Relationships**:
- Created from `Aprovacao` (1:1)
- References `Veiculo` (*:1)
- References `Cliente` (*:1)
- Contains many `Servico` (1:*)
- May have many `AutorizacaoAdicional` (1:*)
- Generates one `Pagamento` (1:1)

---

### 11. Servico (Service Task)

**Context**: Execução

**Purpose**: Individual repair or maintenance task within service order.

**Attributes**:
- `id`: UUID (primary key)
- `ordemServicoId`: UUID (foreign key, required)
- `descricao`: string (required, 10-300 chars)
- `mecanicoId`: UUID (foreign key, required)
- `status`: enum ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO"]
- `dataInicio`: DateTime (set on start)
- `dataConclusao`: DateTime (set on completion)
- `tempoEstimado`: integer (minutes, required)
- `tempoReal`: integer (minutes, calculated)
- `observacoes`: string (optional, max 1000 chars)

**Operations**:
- `iniciar()`: Sets status to EM_ANDAMENTO
- `requisitarPeca(pecaId, quantidade)`: Creates Requisicao
- `concluir()`: Sets status to CONCLUIDO, calculates tempo real
- `cancelar(motivo)`: Sets status to CANCELADO

**Business Rules**:
- Mechanic must have appropriate specialization
- Cannot start if required parts not reserved
- Must record all parts used
- Cannot complete without quality check

**Relationships**:
- Belongs to `OrdemServico` (*:1)
- Assigned to `Mecânico` (*:1)
- Creates many `Requisicao` (1:*)

---

### 12. AutorizacaoAdicional (Additional Work Authorization)

**Context**: Execução

**Purpose**: Customer approval for unexpected repairs discovered during service.

**Attributes**:
- `id`: UUID (primary key)
- `ordemServicoId`: UUID (foreign key, required)
- `descricao`: string (required, 20-500 chars)
- `valorEstimado`: decimal (required, >= 0, 2 decimal places)
- `status`: enum ["SOLICITADA", "APROVADA", "REJEITADA"]
- `dataSolicitacao`: DateTime (auto-set)
- `dataResposta`: DateTime (set on approval/rejection)
- `aprovadoPor`: string (customer name/signature)
- `observacoes`: string (optional)

**Operations**:
- `solicitar()`: Sets status to SOLICITADA, notifies customer
- `aprovar()`: Sets status to APROVADA
- `rejeitar()`: Sets status to REJEITADA

**Business Rules**:
- Values > R$ 1000 require manager approval
- Must notify customer within 30 minutes
- Work cannot proceed without approval
- Customer has 24 hours to respond (default reject)

**Relationships**:
- Belongs to `OrdemServico` (*:1)

---

### 13. Estoque (Warehouse/Inventory)

**Context**: Estoque

**Purpose**: Physical storage location for parts and supplies.

**Attributes**:
- `id`: UUID (primary key)
- `nome`: string (required, unique, 3-100 chars)
- `localizacao`: string (required, e.g., "Matriz", "Filial Centro")
- `tipo`: enum ["PRINCIPAL", "SECUNDARIO"]
- `ativo`: boolean (default: true)
- `capacidadeMaxima`: integer (optional, items)
- `responsavel`: string (optional, employee name)

**Operations**:
- `consultarDisponibilidade(pecaId)`: Returns ItemEstoque
- `reservarPeca(pecaId, quantidade)`: Marks as reserved
- `utilizarPeca(pecaId, quantidade)`: Decrements stock
- `receberPeca(pecaId, quantidade)`: Increments stock
- `verificarNivelMinimo()`: Checks all items at/below minimum

**Business Rules**:
- Cannot utilize parts without reservation
- Stock cannot go negative
- Must have at least one PRINCIPAL warehouse active

**Relationships**:
- Contains many `ItemEstoque` (1:*)

---

### 14. Peca (Part)

**Context**: Estoque

**Purpose**: Catalog of available parts and supplies.

**Attributes**:
- `id`: UUID (primary key)
- `codigo`: string (required, unique, SKU format)
- `descricao`: string (required, 5-200 chars)
- `fornecedorId`: UUID (foreign key, required)
- `categoria`: enum ["MOTOR", "TRANSMISSAO", "SUSPENSAO", "FREIOS", "ELETRICA", "FLUIDOS", "FILTROS", "OUTROS"]
- `precoCompra`: decimal (required, >= 0, 2 decimal places)
- `precoVenda`: decimal (required, >= precoCompra, 2 decimal places)
- `margemLucro`: decimal (calculated: (precoVenda - precoCompra) / precoCompra * 100)
- `unidadeMedida`: enum ["UNIDADE", "LITRO", "METRO", "KG"]
- `nivelMinimo`: integer (required, >= 0)
- `nivelMaximo`: integer (required, > nivelMinimo)
- `ativo`: boolean (default: true)

**Operations**:
- `calcularMargemLucro()`: (precoVenda - precoCompra) / precoCompra * 100
- `atualizarPreco(novoPrecoCompra, novoPrecoVenda)`: Updates pricing
- `desativar()`: Sets ativo = false (soft delete)

**Business Rules**:
- Codigo must be unique
- PrecoVenda must be >= PrecoCompra (minimum 0% margin)
- NivelMaximo must be > NivelMinimo
- Cannot delete if referenced by ItemEstoque with stock > 0

**Relationships**:
- Supplied by `Fornecedor` (*:1)
- Referenced by `ItemEstoque` (1:*)
- Referenced by `ItemOrcamento` (1:*)
- Ordered in `ItemPedido` (1:*)

---

### 15. ItemEstoque (Inventory Item)

**Context**: Estoque

**Purpose**: Physical stock quantity of a part in a specific warehouse.

**Attributes**:
- `id`: UUID (primary key)
- `estoqueId`: UUID (foreign key, required)
- `pecaId`: UUID (foreign key, required)
- `quantidadeDisponivel`: integer (required, >= 0)
- `quantidadeReservada`: integer (required, >= 0)
- `quantidadeTotal`: integer (calculated: disponivel + reservada)
- `localizacaoFisica`: string (optional, e.g., "Prateleira A3")
- `lote`: string (optional)
- `dataValidade`: DateTime (optional, for perishable items)
- `ultimaMovimentacao`: DateTime (auto-update)

**Operations**:
- `verificarDisponibilidade()`: Returns quantidadeDisponivel
- `reservar(quantidade)`: disponivel -= n, reservada += n
- `utilizar(quantidade)`: reservada -= n
- `adicionar(quantidade)`: disponivel += n
- `verificarNivelMinimo()`: Compares with Peca.nivelMinimo

**Business Rules**:
- quantidadeDisponivel + quantidadeReservada = quantidadeTotal
- Cannot reserve more than available
- Cannot utilize more than reserved
- Low stock (disponivel <= nivelMinimo) triggers alert

**Relationships**:
- Belongs to `Estoque` (*:1)
- References `Peca` (*:1)
- Unique constraint: (estoqueId, pecaId)

---

### 16. Requisicao (Parts Request)

**Context**: Estoque, Execução

**Purpose**: Request to reserve and use parts for a service.

**Attributes**:
- `id`: UUID (primary key)
- `servicoId`: UUID (foreign key, required)
- `pecaId`: UUID (foreign key, required)
- `quantidade`: integer (required, > 0)
- `status`: enum ["SOLICITADA", "RESERVADA", "UTILIZADA", "CANCELADA"]
- `dataSolicitacao`: DateTime (auto-set)
- `dataReserva`: DateTime (set when reserved)
- `dataUtilizacao`: DateTime (set when used)
- `observacoes`: string (optional)

**Operations**:
- `solicitar()`: Sets status to SOLICITADA
- `reservar()`: Sets status to RESERVADA, updates ItemEstoque
- `utilizar()`: Sets status to UTILIZADA, decrements ItemEstoque
- `cancelar()`: Sets status to CANCELADA, releases reservation

**Business Rules**:
- Must check availability before reserving
- Cannot utilize without prior reservation
- Cancellation releases reserved quantity
- Generates PedidoCompra if insufficient stock

**Relationships**:
- Belongs to `Servico` (*:1)
- References `Peca` (*:1)

---

### 17. PedidoCompra (Purchase Order)

**Context**: Compras

**Purpose**: Order sent to supplier for parts replenishment.

**Attributes**:
- `id`: UUID (primary key)
- `numeroPedido`: string (unique, auto-generated, format: PO-YYYYMMDD-####)
- `fornecedorId`: UUID (foreign key, required)
- `valorTotal`: decimal (calculated, 2 decimal places)
- `status`: enum ["GERADO", "ENVIADO", "CONFIRMADO", "EM_TRANSITO", "RECEBIDO", "CANCELADO"]
- `dataGeracao`: DateTime (auto-set)
- `dataEnvio`: DateTime (set when sent)
- `dataPrevisaoEntrega`: DateTime (estimated by supplier)
- `dataRecebimento`: DateTime (set when received)
- `condicoesPagamento`: string (optional)
- `observacoes`: string (optional, max 1000 chars)

**Operations**:
- `adicionarItem(pecaId, quantidade, valorUnitario)`: Creates ItemPedido
- `calcularTotal()`: Sums all items
- `enviar()`: Sets status to ENVIADO
- `confirmarRecebimento()`: Sets status to RECEBIDO, updates ItemEstoque
- `cancelar(motivo)`: Sets status to CANCELADO

**Business Rules**:
- Auto-generated when stock reaches minimum level
- Must have at least one item
- Cannot modify after ENVIADO
- Manager approval required for values > R$ 10,000

**Relationships**:
- Sent to `Fornecedor` (*:1)
- Contains many `ItemPedido` (1:*)

---

### 18. ItemPedido (Purchase Order Item)

**Context**: Compras

**Purpose**: Line item in purchase order.

**Attributes**:
- `id`: UUID (primary key)
- `pedidoCompraId`: UUID (foreign key, required)
- `pecaId`: UUID (foreign key, required)
- `quantidade`: integer (required, > 0)
- `valorUnitario`: decimal (required, >= 0, 2 decimal places)
- `valorTotal`: decimal (calculated: quantidade * valorUnitario)
- `quantidadeRecebida`: integer (default: 0, <= quantidade)

**Operations**:
- `calcularValorTotal()`: quantidade * valorUnitario
- `registrarRecebimento(quantidadeRecebida)`: Updates received quantity

**Business Rules**:
- quantidade must be positive
- quantidadeRecebida cannot exceed quantidade
- Parent PedidoCompra must not be CANCELADO

**Relationships**:
- Belongs to `PedidoCompra` (*:1)
- References `Peca` (*:1)

---

### 19. Fornecedor (Supplier)

**Context**: Compras

**Purpose**: External company supplying parts.

**Attributes**:
- `id`: UUID (primary key)
- `nome`: string (required, 3-100 chars)
- `cnpj`: string (required, unique, 14 digits)
- `telefone`: string (required)
- `email`: string (required, email format)
- `endereco`: embedded object (same structure as Cliente)
- `prazoEntregaMedio`: integer (days, optional)
- `condicoesPagamento`: string (optional, e.g., "30/60 dias")
- `avaliacao`: decimal (0-5, 1 decimal place)
- `ativo`: boolean (default: true)
- `dataCadastro`: DateTime (auto-set)

**Operations**:
- `avaliar(nota)`: Updates avaliacao rating
- `atualizarPrazo(novoPrazo)`: Updates prazoEntregaMedio
- `desativar()`: Sets ativo = false

**Business Rules**:
- CNPJ must be valid
- Avaliacao must be 0-5 range
- Cannot delete if has pending PedidoCompra
- Prefer suppliers with higher avaliacao

**Relationships**:
- Supplies many `Peca` (1:*)
- Receives many `PedidoCompra` (1:*)

---

### 20. Pagamento (Payment)

**Context**: Financeiro

**Purpose**: Financial transaction for completed service order.

**Attributes**:
- `id`: UUID (primary key)
- `ordemServicoId`: UUID (foreign key, required, unique)
- `clienteId`: UUID (foreign key, required)
- `valorTotal`: decimal (required, > 0, 2 decimal places)
- `formaPagamento`: enum ["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "BOLETO", "TRANSFERENCIA"]
- `tipoPagamento`: enum ["A_VISTA", "PARCELADO"]
- `numeroParcelas`: integer (required if PARCELADO, 1-12)
- `status`: enum ["PENDENTE", "CONFIRMADO", "CANCELADO", "ESTORNADO"]
- `dataPagamento`: DateTime (set on confirmation)
- `dataVencimento`: DateTime (for BOLETO)
- `comprovante`: string (optional, file path or transaction ID)
- `observacoes`: string (optional)

**Operations**:
- `gerarParcelas()`: Creates Parcela records if PARCELADO
- `confirmar()`: Sets status to CONFIRMADO
- `cancelar()`: Sets status to CANCELADO
- `estornar(motivo)`: Sets status to ESTORNADO, refund process

**Business Rules**:
- Can only create payment for CONCLUIDA OS
- A_VISTA must have numeroParcelas = 1
- PARCELADO max 12 installments, min R$ 50 per installment
- BOLETO requires dataVencimento
- PIX auto-confirms on receipt

**Relationships**:
- Belongs to `OrdemServico` (1:1)
- Belongs to `Cliente` (*:1)
- Contains many `Parcela` (1:*) if parcelado

---

### 21. Parcela (Installment)

**Context**: Financeiro

**Purpose**: Individual installment in a payment plan.

**Attributes**:
- `id`: UUID (primary key)
- `pagamentoId`: UUID (foreign key, required)
- `numeroParcela`: integer (required, 1 to total)
- `valorParcela`: decimal (required, > 0, 2 decimal places)
- `dataVencimento`: DateTime (required)
- `status`: enum ["PENDENTE", "PAGA", "ATRASADA", "CANCELADA"]
- `dataPagamento`: DateTime (set when paid)
- `valorPago`: decimal (optional, may differ due to fees/discounts)
- `jurosMulta`: decimal (optional, calculated for late payment)

**Operations**:
- `registrarPagamento(valorPago, data)`: Sets status to PAGA
- `calcularJuros()`: Computes late fees if past due
- `cancelar()`: Sets status to CANCELADA

**Business Rules**:
- numeroParcela must be sequential (1, 2, 3, ...)
- Sum of all valorParcela must equal Pagamento.valorTotal
- dataVencimento must be in sequence (monthly intervals typical)
- Overdue > 7 days: status becomes ATRASADA
- Juros: 2% + 0.033% per day after vencimento

**Relationships**:
- Belongs to `Pagamento` (*:1)

---

## Aggregate Design

### Aggregate Roots
1. **Cliente** - Controls Agendamento, shares identity with Financeiro
2. **Veiculo** - Lifetime independent of Cliente, controls Diagnostico
3. **Diagnostico** - Controls Problema, generates Orçamento
4. **Orçamento** - Controls ItemOrcamento and Aprovacao
5. **OrdemServico** - Controls Servico and AutorizacaoAdicional
6. **Estoque** - Controls ItemEstoque
7. **Peca** - Controls pricing and catalog
8. **PedidoCompra** - Controls ItemPedido
9. **Pagamento** - Controls Parcela

### Consistency Boundaries
- Changes within an aggregate are ACID
- Changes across aggregates are eventually consistent
- Use domain events to propagate state changes

### Repository Access Patterns
- Always load aggregate root first
- Eager load children within aggregate boundary
- Lazy load across aggregate references

## Validation Rules Summary

### Cross-Entity Constraints
1. Cannot create OS without approved Orçamento
2. Cannot utilize Peca without Requisicao reservation
3. Cannot record Pagamento without OS completion
4. Cannot start Diagnostico without vehicle reception
5. Cannot fulfill Requisicao without sufficient ItemEstoque
6. Cannot complete Servico without recording all Peças used

### Status Transitions
Valid state machines are documented in each entity's status enum.

### Naming Conventions
- Entity names: PascalCase (e.g., OrdemServico)
- Attributes: camelCase (e.g., dataVencimento)
- Enums: SCREAMING_SNAKE_CASE (e.g., EM_ANDAMENTO)
- Collections: plural (e.g., pecas, servicos)

## MongoDB Schema Considerations
- Use embedded documents for value objects (e.g., Endereco)
- Use references (ObjectId) for aggregate root relationships
- Index foreign keys and status fields
- Create compound indexes for common queries
- Use TTL indexes for soft deletes (ativo field)

---

**Document Version**: 1.0  
**Last Updated**: Based on Miro board analysis  
**See Also**: `implementation_plan.md` for development sequencing
