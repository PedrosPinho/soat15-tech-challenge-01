export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Auto Repair Shop API',
    description:
      'Sistema de gestão para oficinas mecânicas — clientes, veículos, ordens de serviço, estoque de peças e pagamentos.',
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
    { name: 'Pagamentos', description: 'Registro e consulta de pagamentos' },
    { name: 'Relatórios', description: 'Dashboard e métricas' },
    { name: 'Health', description: 'Saúde da aplicação' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
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
          status: { type: 'string', enum: ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] },
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
          cpfCnpj: { type: 'string', example: '52998224725', description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) do cliente' },
          placa: { type: 'string', example: 'ABC1D23', description: 'Placa do veículo (formato antigo ou Mercosul)' },
          quilometragemEntrada: { type: 'number', example: 52000 },
          observacoes: { type: 'string' },
          catalogoServicoId: { type: 'string', format: 'uuid' },
          precoServico: { type: 'number', example: 120.0 },
          servicos: {
            type: 'array',
            items: {
              type: 'object',
              required: ['descricao', 'tempoEstimadoMinutos', 'valorMaoDeObra'],
              properties: {
                descricao: { type: 'string', example: 'Troca de pastilhas' },
                tempoEstimadoMinutos: { type: 'integer', example: 60 },
                valorMaoDeObra: { type: 'number', example: 150.0 },
                observacoes: { type: 'string' },
              },
            },
          },
        },
      },
      Pagamento: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          ordemServicoId: { type: 'string', format: 'uuid' },
          valor: { type: 'number', example: 335.8 },
          formaPagamento: {
            type: 'string',
            enum: ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA'],
          },
          status: { type: 'string', enum: ['PENDENTE', 'CONFIRMADO', 'CANCELADO'] },
          dataPagamento: { type: 'string', format: 'date-time' },
          observacoes: { type: 'string' },
        },
      },
      CreatePagamento: {
        type: 'object',
        required: ['ordemServicoId', 'valor', 'formaPagamento'],
        properties: {
          ordemServicoId: { type: 'string', format: 'uuid' },
          valor: { type: 'number', example: 335.8 },
          formaPagamento: {
            type: 'string',
            enum: ['DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'TRANSFERENCIA'],
          },
          observacoes: { type: 'string' },
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
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          200: {
            description: 'Aplicação em funcionamento',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
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
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@oficina.com' },
                  password: { type: 'string', example: 'senha123' },
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
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] } },
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
    '/api/ordens-servico/{id}/iniciar': {
      patch: {
        tags: ['Ordens de Serviço'],
        summary: 'Iniciar OS (ABERTA → EM_ANDAMENTO)',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'OS iniciada', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrdemServico' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/ordens-servico/{id}/concluir': {
      patch: {
        tags: ['Ordens de Serviço'],
        summary: 'Concluir OS (EM_ANDAMENTO → CONCLUIDA)',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'OS concluída', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrdemServico' } } } },
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
          200: { description: 'OS cancelada', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrdemServico' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/pagamentos': {
      post: {
        tags: ['Pagamentos'],
        summary: 'Registrar pagamento',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePagamento' } } },
        },
        responses: {
          201: { description: 'Pagamento registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pagamento' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      get: {
        tags: ['Pagamentos'],
        summary: 'Listar pagamentos',
        parameters: [
          { $ref: '#/components/parameters/pageParam' },
          { $ref: '#/components/parameters/limitParam' },
          { name: 'ordemServicoId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDENTE', 'CONFIRMADO', 'CANCELADO'] } },
        ],
        responses: {
          200: {
            description: 'Lista paginada',
            content: { 'application/json': { schema: { type: 'object', properties: { pagamentos: { type: 'array', items: { $ref: '#/components/schemas/Pagamento' } }, total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' } } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/pagamentos/{id}': {
      get: {
        tags: ['Pagamentos'],
        summary: 'Buscar pagamento por ID',
        parameters: [{ $ref: '#/components/parameters/idParam' }],
        responses: {
          200: { description: 'Pagamento', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pagamento' } } } },
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
