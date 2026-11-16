export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Auto Repair Shop API',
    description:
      'Sistema de gestão para oficinas mecânicas — clientes, veículos, ordens de serviço, estoque de peças. Pagamentos pertencem ao Billing Service; o ciclo da OS é orquestrado por uma Saga (ver README).',
    version: '1.0.0',
    contact: {
      name: 'Tech Challenge SOAT FIAP',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Desenvolvimento local',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação' },
    { name: 'Clientes', description: 'Gestão de clientes' },
    { name: 'Veículos', description: 'Gestão de veículos' },
    { name: 'Peças', description: 'Catálogo de peças e estoque' },
    { name: 'Serviços', description: 'Catálogo de serviços' },
    { name: 'Ordens de Serviço', description: 'Ciclo de vida das ordens de serviço' },
    { name: 'Relatórios', description: 'Dashboard e métricas' },
    { name: 'Health', description: 'Saúde da aplicação' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Aceita dois tipos de token (RFC-003): `scope: interno` (emitido por `POST /api/auth/login`, e-mail/senha — acessa as rotas de gestão) e `scope: cliente` (emitido pela Lambda de CPF em `soat15-tech-challenge-auth-lambda` — só acessa `GET /api/ordens-servico/buscar` com o próprio CPF/CNPJ). Rotas de gestão exigem `scope: interno`; um token `cliente` válido recebe 403, não 401.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          code: { type: 'string' },
        },
        required: ['message'],
      },
      Endereco: {
        type: 'object',
        properties: {
          logradouro: { type: 'string', example: 'Rua das Flores' },
          numero: { type: 'string', example: '123' },
          complemento: { type: 'string', example: 'Apto 4' },
          bairro: { type: 'string', example: 'Centro' },
          cidade: { type: 'string', example: 'São Paulo' },
          estado: { type: 'string', example: 'SP' },
          cep: { type: 'string', example: '01234567' },
        },
        required: ['logradouro', 'numero', 'cidade', 'estado', 'cep'],
      },
      Cliente: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string', example: 'João Silva' },
          cpfCnpj: { type: 'string', example: '12345678901' },
          tipo: { type: 'string', enum: ['PESSOA_FISICA', 'PESSOA_JURIDICA'] },
          telefone: { type: 'string', example: '11987654321' },
          email: { type: 'string', format: 'email', example: 'joao@email.com' },
          endereco: { $ref: '#/components/schemas/Endereco' },
          ativo: { type: 'boolean' },
        },
      },
      CreateCliente: {
        type: 'object',
        required: ['nome', 'cpfCnpj', 'tipo', 'telefone', 'email', 'endereco'],
        properties: {
          nome: { type: 'string', example: 'João Silva' },
          cpfCnpj: { type: 'string', example: '12345678901' },
          tipo: { type: 'string', enum: ['PESSOA_FISICA', 'PESSOA_JURIDICA'] },
          telefone: { type: 'string', example: '11987654321' },
          email: { type: 'string', format: 'email', example: 'joao@email.com' },
          endereco: { $ref: '#/components/schemas/Endereco' },
        },
      },
      Veiculo: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          clienteId: { type: 'string', format: 'uuid' },
          placa: { type: 'string', example: 'ABC1D23' },
          placaFormatada: { type: 'string', example: 'ABC-1D23' },
          marca: { type: 'string', example: 'Honda' },
          modelo: { type: 'string', example: 'Civic' },
          ano: { type: 'integer', example: 2020 },
          cor: { type: 'string', example: 'Prata' },
          quilometragem: { type: 'number', example: 50000 },
          observacoes: { type: 'string' },
        },
      },
      CreateVeiculo: {
        type: 'object',
        required: ['clienteId', 'placa', 'marca', 'modelo', 'ano', 'quilometragem'],
        properties: {
          clienteId: { type: 'string', format: 'uuid' },
          placa: { type: 'string', example: 'ABC1D23' },
          marca: { type: 'string', example: 'Honda' },
          modelo: { type: 'string', example: 'Civic' },
          ano: { type: 'integer', example: 2020 },
          cor: { type: 'string', example: 'Prata' },
          quilometragem: { type: 'number', example: 50000 },
          observacoes: { type: 'string' },
        },
      },
      Peca: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          codigo: { type: 'string', example: 'OL-5W30-1L' },
          descricao: { type: 'string', example: 'Óleo Motor 5W30 1L' },
          categoria: {
            type: 'string',
            enum: ['MOTOR', 'TRANSMISSAO', 'SUSPENSAO', 'FREIOS', 'ELETRICA', 'FLUIDOS', 'FILTROS', 'OUTROS'],
          },
          unidadeMedida: { type: 'string', enum: ['UNIDADE', 'LITRO', 'METRO', 'KG'] },
          precoCompra: { type: 'number', example: 18.5 },
          precoVenda: { type: 'number', example: 32.9 },
          margemLucro: { type: 'number', example: 77.84 },
          nivelMinimo: { type: 'integer', example: 5 },
          nivelMaximo: { type: 'integer', example: 50 },
          ativo: { type: 'boolean' },
        },
      },
      CreatePeca: {
        type: 'object',
        required: ['codigo', 'descricao', 'categoria', 'unidadeMedida', 'precoCompra', 'precoVenda', 'nivelMinimo', 'nivelMaximo'],
        properties: {
          codigo: { type: 'string', example: 'OL-5W30-1L' },
          descricao: { type: 'string', example: 'Óleo Motor 5W30 1L' },
          categoria: {
            type: 'string',
            enum: ['MOTOR', 'TRANSMISSAO', 'SUSPENSAO', 'FREIOS', 'ELETRICA', 'FLUIDOS', 'FILTROS', 'OUTROS'],
          },
          unidadeMedida: { type: 'string', enum: ['UNIDADE', 'LITRO', 'METRO', 'KG'] },
          precoCompra: { type: 'number', example: 18.5 },
          precoVenda: { type: 'number', example: 32.9 },
          nivelMinimo: { type: 'integer', example: 5 },
          nivelMaximo: { type: 'integer', example: 50 },
        },
      },
      CatalogoServico: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          descricao: { type: 'string', example: 'Troca de óleo e filtro' },
          preco: { type: 'number', example: 120.0 },
          tempoEstimado: { type: 'number', example: 1.5, description: 'Horas' },
          ativo: { type: 'boolean' },
        },
      },
      CreateCatalogoServico: {
        type: 'object',
        required: ['descricao', 'preco', 'tempoEstimado'],
        properties: {
          descricao: { type: 'string', example: 'Troca de óleo e filtro' },
          preco: { type: 'number', example: 120.0 },
          tempoEstimado: { type: 'number', example: 1.5 },
        },
      },
      PecaServico: {
        type: 'object',
        properties: {
          pecaId: { type: 'string', format: 'uuid' },
          quantidade: { type: 'integer', example: 2 },
          precoUnitario: { type: 'number', example: 32.9 },
        },
      },
      Servico: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          descricao: { type: 'string', example: 'Troca de pastilhas de freio' },
          status: { type: 'string', enum: ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'] },
          tempoEstimadoMinutos: { type: 'integer', example: 60 },
          tempoRealMinutos: { type: 'integer', example: 75 },
          valorMaoDeObra: { type: 'number', example: 150.0 },
          valorTotalPecas: { type: 'number', example: 65.8 },
          valorTotal: { type: 'number', example: 215.8 },
          pecasUtilizadas: { type: 'array', items: { $ref: '#/components/schemas/PecaServico' } },
          observacoes: { type: 'string' },
        },
      },
      OrdemServico: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          numeroOS: { type: 'string', example: 'OS-20260428-0001' },
          clienteId: { type: 'string', format: 'uuid' },
          veiculoId: { type: 'string', format: 'uuid' },
          quilometragemEntrada: { type: 'number', example: 52000 },
          status: { type: 'string', enum: ['RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE', 'CANCELADA'] },
          dataAbertura: { type: 'string', format: 'date-time' },
          dataInicio: { type: 'string', format: 'date-time' },
          dataConclusao: { type: 'string', format: 'date-time' },
          observacoes: { type: 'string' },
          motivoCancelamento: { type: 'string' },
          temPagamento: { type: 'boolean' },
          catalogoServicoId: { type: 'string', format: 'uuid' },
          precoServico: { type: 'number', example: 120.0 },
          servicos: { type: 'array', items: { $ref: '#/components/schemas/Servico' } },
          valorTotal: { type: 'number', example: 335.8 },
        },
      },
      CreateOrdemServico: {
        type: 'object',
        required: ['cpfCnpj', 'placa', 'quilometragemEntrada'],
        properties: {
          cpfCnpj: { type: 'string', example: '43201810851', description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) do cliente' },
          placa: { type: 'string', example: 'UFW6E59', description: 'Placa do veículo (formato antigo ou Mercosul)' },
          quilometragemEntrada: { type: 'number', example: 2000 },
          observacoes: { type: 'string', example: 'Troca de óleo' },
          catalogoServicos: {
            type: 'array',
            description: 'Serviços do catálogo a serem executados. Preço e tempo são resolvidos automaticamente.',
            items: {
              type: 'object',
              required: ['catalogoServicoId'],
              properties: {
                catalogoServicoId: { type: 'string', format: 'uuid', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
                pecasUtilizadas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['pecaId', 'quantidade'],
                    properties: {
                      pecaId: { type: 'string', format: 'uuid', example: '3d468fa5-2492-4ab9-975d-0540f74d5517' },
                      quantidade: { type: 'integer', example: 1, minimum: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      Dashboard: {
        type: 'object',
        properties: {
          ordensServico: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              abertas: { type: 'integer' },
              emAndamento: { type: 'integer' },
              concluidas: { type: 'integer' },
              canceladas: { type: 'integer' },
            },
          },
          financeiro: {
            type: 'object',
            properties: {
              receitaTotal: { type: 'number' },
            },
          },
          estoque: {
            type: 'object',
            properties: {
              itensAbaixoDoMinimo: { type: 'integer' },
            },
          },
        },
      },
    },
    parameters: {
      pageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1 },
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 20 },
      },
      idParam: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Token JWT ausente ou inválido',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Recurso não encontrado',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      BadRequest: {
        description: 'Dados inválidos',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Processo vivo (nunca toca o banco)',
        security: [],
        responses: {
          200: {
            description: 'Processo em execução',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'UP' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Banco alcançável (usado pela readinessProbe)',
        security: [],
        responses: {
          200: {
            description: 'Postgres alcançável',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'UP' },
                    timestamp: { type: 'string', format: 'date-time' },
                    database: { type: 'string', example: 'CONNECTED' },
                  },
                },
              },
            },
          },
          503: {
            description: 'Postgres inalcançável',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Alias de /health/ready (compatibilidade)',
        security: [],
        responses: {
          200: { description: 'Postgres alcançável' },
          503: { description: 'Postgres inalcançável' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login e obtenção de token JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'senha'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@oficina.com' },
                  senha: { type: 'string', example: 'senha123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Token JWT gerado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { token: { type: 'string' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/clientes': {
      post: {
        tags: ['Clientes'],
        summary: 'Criar cliente',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCliente' } } },
        },
        responses: {
          201: {
            description: 'Cliente criado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cliente' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Clientes'],
        summary: 'Listar clientes',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'Lista paginada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    clientes: { type: 'array', items: { $ref: '#/components/schemas/Cliente' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/clientes/{id}': {
      get: {
        tags: ['Clientes'],
        summary: 'Buscar cliente por ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Cliente', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cliente' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Clientes'],
        summary: 'Atualizar cliente',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCliente' } } },
        },
        responses: {
          200: { description: 'Cliente atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cliente' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Clientes'],
        summary: 'Desativar cliente (soft delete)',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          204: { description: 'Cliente desativado' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/clientes/{clienteId}/veiculos': {
      get: {
        tags: ['Veículos'],
        summary: 'Listar veículos do cliente',
        parameters: [
          { name: 'clienteId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'Lista de veículos',
            content: { 'application/json': { schema: { type: 'object', properties: { veiculos: { type: 'array', items: { $ref: '#/components/schemas/Veiculo' } }, total: { type: 'integer' } } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/veiculos': {
      post: {
        tags: ['Veículos'],
        summary: 'Criar veículo',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateVeiculo' } } },
        },
        responses: {
          201: { description: 'Veículo criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Veiculo' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/veiculos/{id}': {
      get: {
        tags: ['Veículos'],
        summary: 'Buscar veículo por ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Veículo', content: { 'application/json': { schema: { $ref: '#/components/schemas/Veiculo' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Veículos'],
        summary: 'Atualizar veículo',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateVeiculo' } } },
        },
        responses: {
          200: { description: 'Veículo atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Veiculo' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/pecas': {
      post: {
        tags: ['Peças'],
        summary: 'Criar peça',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePeca' } } },
        },
        responses: {
          201: { description: 'Peça criada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Peca' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Peças'],
        summary: 'Listar peças',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'categoria', in: 'query', schema: { type: 'string', enum: ['MOTOR', 'TRANSMISSAO', 'SUSPENSAO', 'FREIOS', 'ELETRICA', 'FLUIDOS', 'FILTROS', 'OUTROS'] } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Busca por texto na descrição' },
        ],
        responses: {
          200: {
            description: 'Lista paginada',
            content: { 'application/json': { schema: { type: 'object', properties: { pecas: { type: 'array', items: { $ref: '#/components/schemas/Peca' } }, total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' } } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/pecas/{id}': {
      get: {
        tags: ['Peças'],
        summary: 'Buscar peça por ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Peça', content: { 'application/json': { schema: { $ref: '#/components/schemas/Peca' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Peças'],
        summary: 'Atualizar preço da peça',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['precoCompra', 'precoVenda'],
                properties: {
                  precoCompra: { type: 'number' },
                  precoVenda: { type: 'number' },
                  nivelMinimo: { type: 'integer' },
                  nivelMaximo: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Peça atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Peca' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Peças'],
        summary: 'Desativar peça (soft delete)',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          204: { description: 'Peça desativada' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/servicos': {
      post: {
        tags: ['Serviços'],
        summary: 'Criar serviço no catálogo',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCatalogoServico' } } },
        },
        responses: {
          201: { description: 'Serviço criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogoServico' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Serviços'],
        summary: 'Listar serviços do catálogo',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Busca por texto na descrição' },
        ],
        responses: {
          200: {
            description: 'Lista paginada',
            content: { 'application/json': { schema: { type: 'object', properties: { servicos: { type: 'array', items: { $ref: '#/components/schemas/CatalogoServico' } }, total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' } } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/servicos/{id}': {
      get: {
        tags: ['Serviços'],
        summary: 'Buscar serviço por ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Serviço', content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogoServico' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Serviços'],
        summary: 'Editar serviço',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCatalogoServico' } } },
        },
        responses: {
          200: { description: 'Serviço atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/CatalogoServico' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Serviços'],
        summary: 'Deletar serviço (soft delete)',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          204: { description: 'Serviço desativado' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/ordens-servico/buscar': {
      get: {
        tags: ['Ordens de Serviço'],
        summary: 'Buscar as próprias ordens de serviço por CPF/CNPJ',
        description:
          'Consulta de status das próprias OS (RFC-003/Etapa 2.3). Aceita token `scope: cliente` (emitido pela Lambda de CPF — só pode consultar o próprio CPF/CNPJ, 403 caso contrário) ou `scope: interno` (consulta qualquer CPF/CNPJ).',
        parameters: [
          { name: 'cpfCnpj', in: 'query', required: true, schema: { type: 'string', example: '52998224725' }, description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) do cliente' },
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
        ],
        responses: {
          200: {
            description: 'Lista paginada de OS do cliente',
            content: { 'application/json': { schema: { type: 'object', properties: { ordens: { type: 'array', items: { $ref: '#/components/schemas/OrdemServico' } }, total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' } } } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { description: 'Token de cliente consultando CPF/CNPJ que não é o próprio', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/ordens-servico': {
      post: {
        tags: ['Ordens de Serviço'],
        summary: 'Criar ordem de serviço',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrdemServico' } } },
        },
        responses: {
          201: { description: 'OS criada', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrdemServico' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      get: {
        tags: ['Ordens de Serviço'],
        summary: 'Listar ordens de serviço',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_PAGAMENTO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE', 'CANCELADA'] } },
          { name: 'clienteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'veiculoId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Lista paginada',
            content: { 'application/json': { schema: { type: 'object', properties: { ordens: { type: 'array', items: { $ref: '#/components/schemas/OrdemServico' } }, total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' } } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/ordens-servico/{id}': {
      get: {
        tags: ['Ordens de Serviço'],
        summary: 'Buscar OS por ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Ordem de serviço', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrdemServico' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/ordens-servico/{id}/historico': {
      get: {
        tags: ['Ordens de Serviço'],
        summary: 'Histórico de status e passos da Saga',
        description:
          'Linha do tempo de status da OS e o log dos passos da Saga (diagnóstico, orçamento, pagamento, execução e compensações). Enquanto a OS aguarda pagamento, `saga.linkPagamento` traz o link do Checkout Pro.',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: {
            description: 'Histórico',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ordemServicoId: { type: 'string', format: 'uuid' },
                    numeroOS: { type: 'string' },
                    statusAtual: { type: 'string' },
                    status: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          de: { type: 'string', nullable: true },
                          para: { type: 'string' },
                          motivo: { type: 'string', nullable: true },
                          em: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    saga: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        status: { type: 'string', enum: ['EM_ANDAMENTO', 'COMPENSANDO', 'CONCLUIDA', 'COMPENSADA', 'FALHA_COMPENSACAO'] },
                        passoAtual: { type: 'string' },
                        linkPagamento: { type: 'string', nullable: true },
                        expiraEm: { type: 'string', format: 'date-time', nullable: true },
                        passos: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              passo: { type: 'string' },
                              acao: { type: 'string' },
                              resultado: { type: 'string', enum: ['OK', 'FALHA', 'IGNORADO'] },
                              detalhe: { type: 'string', nullable: true },
                              em: { type: 'string', format: 'date-time' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/ordens-servico/{id}/entregar': {
      patch: {
        tags: ['Ordens de Serviço'],
        summary: 'Entregar OS (FINALIZADA → ENTREGUE)',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'OS entregue ao cliente', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrdemServico' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/ordens-servico/{id}/cancelar': {
      patch: {
        tags: ['Ordens de Serviço'],
        summary: 'Cancelar OS',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['motivo'],
                properties: { motivo: { type: 'string', example: 'Cliente desistiu do serviço' } },
              },
            },
          },
        },
        responses: {
          202: { description: 'Cancelamento aceito: a Saga executa as compensações (estorno, cancelamento do orçamento e da execução, liberação do estoque) e a OS vira CANCELADA ao final. Acompanhe em `GET /{id}/historico`.', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrdemServico' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/relatorios/dashboard': {
      get: {
        tags: ['Relatórios'],
        summary: 'Dashboard com métricas gerais',
        responses: {
          200: { description: 'Dados do dashboard', content: { 'application/json': { schema: { $ref: '#/components/schemas/Dashboard' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};

export const swaggerUiOptions = {
  customSiteTitle: 'Auto Repair Shop API',
  swaggerOptions: {
    persistAuthorization: true,
  },
};
