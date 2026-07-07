import { OrdemServico } from '@domain/entities/ordem-servico.entity';

const sendMailMock = jest.fn().mockResolvedValue(undefined);
const createTransportMock = jest.fn().mockReturnValue({ sendMail: sendMailMock });

jest.mock('nodemailer', () => ({
  createTransport: (...args: unknown[]) => createTransportMock(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  NodemailerNotificationService,
} = require('@infrastructure/notifications/nodemailer-notification.service') as {
  NodemailerNotificationService: new () => {
    enviarAtualizacaoStatus: (destinatario: string, os: OrdemServico) => Promise<void>;
  };
};

function makeOS(): OrdemServico {
  return OrdemServico.create({
    id: 'os-uuid-1',
    numeroOS: 'OS-20260428-0001',
    clienteId: 'cliente-1',
    veiculoId: 'veiculo-1',
    quilometragemEntrada: 50000,
    status: 'EM_EXECUCAO',
  });
}

describe('NodemailerNotificationService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, SMTP_FROM: 'no-reply@oficina.com' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends an email with the OS status', async () => {
    const service = new NodemailerNotificationService();

    await service.enviarAtualizacaoStatus('cliente@email.com', makeOS());

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@oficina.com',
        to: 'cliente@email.com',
        subject: expect.stringContaining('OS-20260428-0001'),
        text: expect.stringContaining('Em execução'),
      }),
    );
  });
});
