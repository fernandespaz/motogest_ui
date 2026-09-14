import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { orcamentosApi } from './orcamentos';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('orcamentosApi', () => {
  it('inherits the base CRUD methods for /orcamentos', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await orcamentosApi.list();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/orcamentos', { params: undefined });
  });

  it('enviar() POSTs to send the orçamento for client approval', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'ENVIADO' } });

    const result = await orcamentosApi.enviar(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/orcamentos/1/enviar');
    expect(result.status).toBe('ENVIADO');
  });

  it('aprovar() POSTs to approve the orçamento', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'APROVADO' } });

    const result = await orcamentosApi.aprovar(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/orcamentos/1/aprovar');
    expect(result.status).toBe('APROVADO');
  });

  it('rejeitar() POSTs to reject the orçamento', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'REJEITADO' } });

    const result = await orcamentosApi.rejeitar(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/orcamentos/1/rejeitar');
    expect(result.status).toBe('REJEITADO');
  });
});
