import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { contasPagarApi } from './contasPagar';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('contasPagarApi', () => {
  it('inherits the base CRUD methods for /contas-pagar', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await contasPagarApi.list();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/contas-pagar', { params: undefined });
  });

  it('pendentes() GETs pending contas within a date range', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }] });

    const result = await contasPagarApi.pendentes('2026-01-01', '2026-01-31');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/contas-pagar/pendentes', {
      params: { inicio: '2026-01-01', fim: '2026-01-31' },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('pagar() POSTs to mark a conta as paid', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'PAGA' } });

    const result = await contasPagarApi.pagar(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contas-pagar/1/pagar');
    expect(result.status).toBe('PAGA');
  });

  it('cancelar() POSTs to cancel a conta', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'CANCELADA' } });

    const result = await contasPagarApi.cancelar(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contas-pagar/1/cancelar');
    expect(result.status).toBe('CANCELADA');
  });
});
