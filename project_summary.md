# Project Summary — Auto Repair Shop Management System

## Executive Overview

This project implements a comprehensive **Auto Repair Shop Management System** using Domain-Driven Design (DDD) principles, Event Storming methodology, and microservices architecture. The system manages the complete lifecycle of automotive repair services from customer appointment through payment collection.

## Technology Stack

- **Backend**: Node.js with TypeScript
- **Database**: MongoDB
- **Architecture**: Domain-Driven Design with Bounded Contexts
- **Integration Patterns**: Customer/Supplier, Shared Kernel, Anti-Corruption Layer, Published Language

## Business Domain

### Core Value Proposition
Streamline automotive repair shop operations by providing:
- Efficient appointment scheduling and customer management
- Systematic diagnostic and repair workflow
- Real-time inventory and parts management
- Integrated financial and payment processing
- Customer transparency through mobile app integration

### Target Users
- **Workshop Staff**: Mechanics, service attendants, managers
- **Customers**: Vehicle owners seeking repair services
- **Management**: Workshop owners and administrators
- **External Systems**: Payment gateways, supplier systems

## System Architecture

### Seven Bounded Contexts

#### 1. Atendimento (Customer Service)
**Purpose**: Initial customer relationship and appointment management
**Key Entities**: Cliente, Veículo, Agendamento, Histórico do Cliente
**Responsibilities**:
- Customer registration (CPF/CNPJ, contact information)
- Vehicle registration (plate, make, model, year, mileage)
- Appointment scheduling (date/time, service type, status)
- Service history tracking

#### 2. Diagnóstico (Diagnostics)
**Purpose**: Technical vehicle inspection and problem identification
**Key Entities**: Diagnóstico, Problema, Mecânico
**Responsibilities**:
- Diagnostic process management
- Problem classification (severity, affected system)
- Mechanic assignment based on specialization
- Diagnostic conclusion with findings

#### 3. Orçamento (Quoting)
**Purpose**: Service and parts pricing with customer approval
**Key Entities**: Orçamento, ItemOrcamento, Aprovação
**Responsibilities**:
- Generate detailed quotes (parts + labor)
- Itemized pricing with quantities and values
- Quote validity management
- Approval workflow (accept/reject)

#### 4. Execução (Service Execution)
**Purpose**: Actual repair service delivery
**Key Entities**: OrdemServico (OS), Serviço, AutorizacaoAdicional
**Responsibilities**:
- Service order lifecycle (open → in-progress → completed/cancelled)
- Task assignment with time tracking
- Priority management
- Additional repair authorization
- Customer notification
- Vehicle delivery

#### 5. Estoque (Inventory)
**Purpose**: Parts and supplies inventory control
**Key Entities**: Estoque, Peça, ItemEstoque, Requisição
**Responsibilities**:
- Multi-location warehouse management
- Part cataloging (code, supplier, pricing)
- Stock levels (min/max thresholds)
- Parts reservation and consumption
- Availability checking
- Low-stock alerts

#### 6. Compras (Purchasing)
**Purpose**: Parts replenishment and supplier management
**Key Entities**: PedidoCompra, ItemPedido, Fornecedor
**Responsibilities**:
- Purchase order generation and tracking
- Supplier evaluation (delivery times, terms, ratings)
- Order status management
- Parts receiving and stock updates

#### 7. Financeiro (Financial)
**Purpose**: Billing and payment processing
**Key Entities**: Pagamento, Parcela, FormaPagamento
**Responsibilities**:
- Payment method support (cash, card, PIX, boleto)
- Installment plans
- Payment confirmation and reversal
- Revenue tracking

### Integration Patterns

#### Shared Kernel (Atendimento ↔ Financeiro)
- **Shared Elements**: Cliente identity (CPF/CNPJ), basic customer entities
- **Coordination**: Mandatory synchronization on schema changes
- **Rationale**: Customer identity consistency across service and billing

#### Customer/Supplier Flow
Linear workflow dependencies:
```
Atendimento → Diagnóstico → Orçamento → Execução
                                           ↓
                                        Estoque → Compras
```
Each upstream context provides data to downstream consumers.

#### Anti-Corruption Layer
- **Financeiro → Pagamento Externo**: Protects core payment logic from external gateway changes
- **Compras → Sistema Fornecedores**: Isolates purchasing from supplier API variations

#### Published Language
- **Execução → App do Cliente**: Stable event schemas for status notifications
- **Financeiro → App do Cliente**: Standard payment and invoice formats

## Domain Model

### 21 Core Entities with Relationships

**Customer Journey Entities**:
1. **Cliente** → manages → **Agendamento** (1:*)
2. **Cliente** → owns → **Veículo** (1:*)
3. **Veículo** → undergoes → **Diagnóstico** (1:*)

**Diagnostic & Planning Entities**:
4. **Diagnóstico** → identifies → **Problema** (1:*)
5. **Diagnóstico** → assigned to → **Mecânico** (1:1)
6. **Diagnóstico** → generates → **Orçamento** (1:1)

**Approval Workflow Entities**:
7. **Orçamento** → contains → **ItemOrcamento** (1:*)
8. **Orçamento** → requires → **Aprovacao** (1:1)

**Service Execution Entities**:
9. **Aprovacao** → creates → **OrdemServico** (1:1)
10. **OrdemServico** → contains → **Servico** (1:*)
11. **Servico** → performed by → **Mecânico** (1:1)
12. **OrdemServico** → may require → **AutorizacaoAdicional** (1:*)

**Inventory & Parts Entities**:
13. **Estoque** → manages → **ItemEstoque** (1:*)
14. **ItemEstoque** → references → **Peca** (1:1)
15. **Servico** → requests → **Requisicao** (1:*)
16. **Requisicao** → requests → **Peca** (1:1)

**Procurement Entities**:
17. **Peca** → supplied by → **Fornecedor** (1:1)
18. **PedidoCompra** → sent to → **Fornecedor** (1:1)
19. **PedidoCompra** → contains → **ItemPedido** (1:*)
20. **ItemPedido** → orders → **Peca** (1:1)

**Financial Entities**:
21. **OrdemServico** → generates → **Pagamento** (1:1)
22. **Pagamento** → divided into → **Parcela** (1:*)

## Business Process Flow

### Main Workflow (Happy Path)
```
1. Cliente → Agendar Atendimento
2. Sistema → Confirmar Agendamento
3. Atendente → Receber Veículo
4. Mecânico → Iniciar Diagnóstico
5. Mecânico → Identificar Problemas
6. Sistema → Gerar Orçamento
7. Cliente → Aprovar Orçamento (Decision Point)
8. Sistema → Criar OS
9. Mecânico → Iniciar Serviço
   → Requisitar Peças (parallel)
   → Verificar Disponibilidade (parallel)
   → Reservar/Utilizar Peças (parallel)
10. Mecânico → Concluir Serviço
11. Mecânico → Verificar Qualidade
12. Sistema → Notificar Cliente
13. Atendente → Entregar Veículo
14. Financeiro → Registrar Pagamento
15. Fim
```

### Decision Points & Branching
- **Orçamento Aprovado?** (Sim/Não) → Gates OS creation
- **Reparo Adicional Necessário?** (Sim/Não) → Triggers AutorizacaoAdicional
- **Peça Disponível?** (Sim/Não) → Reserves or triggers Pedido de Compra

### Automated Policies
1. **Auto-approval**: Orçamentos below threshold auto-approve
2. **Priority escalation**: Urgent OS get priority assignment
3. **Auto-replenishment**: Stock at minimum level triggers purchase order
4. **Status notifications**: Automatic customer updates via app
5. **Quote expiration**: Orçamentos have validity period
6. **Manager authorization**: High-value extras require approval

## Domain Events (12 Key Events)
1. **Agendou Atendimento** → Customer scheduled appointment
2. **Veículo Recebido** → Vehicle checked in
3. **Diagnóstico Concluído** → Inspection complete
4. **Orçamento Aprovado** → Customer approved quote
5. **OS Criada** → Service order opened
6. **Serviço Iniciado** → Work started on vehicle
7. **Autorização Adicional Solicitada** → Extra work requested
8. **Serviço Concluído** → Repair completed
9. **Veículo Entregue** → Customer picked up vehicle
10. **Pagamento Recebido** → Payment confirmed
11. **Estoque em Nível Mínimo** → Low stock alert
12. **Peça Recebida** → Supplier delivery processed

## Business Rules (Invariants)

### Hard Constraints (Must Always Hold)
- ✓ OS can only be created from approved Orçamento
- ✓ Peças can only be used if reserved
- ✓ Pagamento requires vehicle delivery confirmation
- ✓ Diagnóstico requires vehicle reception
- ✓ Requisição can only be fulfilled if stock is available
- ✓ Serviço completion requires all peças to be recorded as used

### Soft Rules (Policies)
- Orçamento validity: 30 days default
- Manager approval threshold: Extras > R$ 1000
- Minimum stock trigger: 10% of max level
- Customer notification: Within 30 minutes of status change
- Payment terms: Up to 3x installments without interest

## Read Models / Projections
1. **Lista de OS em Andamento** → Dashboard for mechanics
2. **Status do Meu Veículo** → Customer mobile view
3. **Histórico do Veículo** → Service history reports
4. **Dashboard de Serviços** → Manager overview
5. **Relatório de Estoque** → Inventory analytics
6. **Histórico do Cliente** → CRM view for attendants

## External System Integrations

### Pagamento Externo (Payment Gateway)
- **Pattern**: Anti-Corruption Layer
- **Direction**: Financeiro → Gateway
- **Purpose**: Credit card/PIX processing
- **Protection**: Isolate core from gateway API changes

### Sistema Fornecedores (Supplier System)
- **Pattern**: Anti-Corruption Layer
- **Direction**: Compras → Supplier API
- **Purpose**: EDI purchase orders, inventory sync
- **Protection**: Prevent supplier system changes from cascading

### App do Cliente (Customer Mobile App)
- **Pattern**: Published Language
- **Direction**: Execução/Financeiro → Mobile App
- **Purpose**: Real-time status updates, payment notifications
- **Schema**: Stable event contracts (JSON schemas)

## Technical Considerations

### Event Sourcing Readiness
- All state transitions captured as domain events (98 total)
- Complete audit trail capability
- Event replay for analytics and debugging

### CQRS Separation
- Write operations: Commands through aggregates
- Read operations: Optimized projections/views
- Eventual consistency between write and read models

### Saga Orchestration
Complex workflows requiring coordination:
- **Order Fulfillment Saga**: Check inventory → Reserve parts → Create OS → Execute service → Update inventory
- **Purchase Saga**: Detect low stock → Generate PO → Send to supplier → Receive parts → Update inventory

### Microservices Deployment Strategy
- Each bounded context = potential microservice
- API Gateway for external integrations
- Event bus for inter-context communication
- Shared database per context (MongoDB collections)

### Scalability & Resilience
- Context independence enables horizontal scaling
- Eventual consistency via Customer/Supplier pattern
- ACL prevents cascading failures from external systems
- Circuit breakers on external integrations

## Success Metrics

### Operational KPIs
- Average time from appointment to service completion
- Diagnostic accuracy rate
- Quote approval rate
- On-time service completion percentage
- Parts availability rate
- Payment collection efficiency

### Business KPIs
- Customer satisfaction score
- Repeat customer rate
- Revenue per service order
- Inventory turnover rate
- Supplier delivery performance
- Average ticket value

## Documentation Quality Notes
- Exceptional alignment between process flow, domain model, and context map
- Complete traceability from business events to technical implementation
- Bilingual content (Portuguese domain terms, English patterns)
- Suitable for international development teams

## Next Steps
See `docs/implementation_plan.md` for detailed development roadmap.
