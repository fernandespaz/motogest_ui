import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { descontosApi } from './descontos';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('descontosApi', () => {
  it('list() GETs paginated solicitações, forwarding filter params', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await descontosApi.list({ origemTipo: 'ORCAMENTO', status: 'PENDENTE' });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/descontos', {
      params: { origemTipo: 'ORCAMENTO', status: 'PENDENTE' },
    });
  });

  it('get() GETs a single solicitação by id', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1, status: 'PENDENTE' } });

    const result = await descontosApi.get(1);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/descontos/1');
    expect(result.status).toBe('PENDENTE');
  });

  it('solicitar() POSTs a new solicitação de desconto', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, status: 'PENDENTE' } });

    await descontosApi.solicitar({ itemId: 5, valorSolicitado: 10 } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/descontos', { itemId: 5, valorSolicitado: 10 });
  });

  it('aprovar() POSTs to approve a solicitação', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, status: 'APROVADO' } });

    const result = await descontosApi.aprovar(2);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/descontos/2/aprovar');
    expect(result.status).toBe('APROVADO');
  });

  it('rejeitar() POSTs a rejection reason', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, status: 'REJEITADO' } });

    const result = await descontosApi.rejeitar(2, { motivo: 'Fora da política' } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/descontos/2/rejeitar', { motivo: 'Fora da política' });
    expect(result.status).toBe('REJEITADO');
  });
});
