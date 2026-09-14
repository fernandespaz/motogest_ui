import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { ordensServicoApi } from './ordensServico';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ordensServicoApi', () => {
  it('inherits the base CRUD methods for /ordens-servico', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await ordensServicoApi.list({ status: 'ABERTA' } as never);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/ordens-servico', { params: { status: 'ABERTA' } });
  });

  it('criarAPartirDeOrcamento() POSTs with the optional responsável as a query param', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });

    await ordensServicoApi.criarAPartirDeOrcamento(5, 9);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/ordens-servico/a-partir-de-orcamento/5', null, {
      params: { usuarioResponsavelId: 9 },
    });
  });

  it('atualizarStatus() PATCHes the OS status', async () => {
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { id: 1, status: 'CONCLUIDA' } });

    const result = await ordensServicoApi.atualizarStatus(1, 'CONCLUIDA');

    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/ordens-servico/1/status', null, {
      params: { status: 'CONCLUIDA' },
    });
    expect(result.status).toBe('CONCLUIDA');
  });

  it('enviar() POSTs to generate/renew the approval token', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'AGUARDANDO_APROVACAO' } });

    const result = await ordensServicoApi.enviar(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/ordens-servico/1/enviar');
    expect(result.status).toBe('AGUARDANDO_APROVACAO');
  });

  it('timerStart() POSTs to start the OS timer', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'EM_ANDAMENTO' } });

    await ordensServicoApi.timerStart(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/ordens-servico/1/timer/start');
  });

  it('timerPause() POSTs the pause reason', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'PAUSADA' } });

    await ordensServicoApi.timerPause(1, 'Aguardando peça');

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/ordens-servico/1/timer/pause', { motivo: 'Aguardando peça' });
  });

  it('timerResume() POSTs to resume the OS timer', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'EM_ANDAMENTO' } });

    await ordensServicoApi.timerResume(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/ordens-servico/1/timer/resume');
  });
});
