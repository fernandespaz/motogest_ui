import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { contasReceberApi } from './contasReceber';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('contasReceberApi', () => {
  it('inherits the base CRUD methods for /contas-receber', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await contasReceberApi.list();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/contas-receber', { params: undefined });
  });

  it('pendentes() GETs pending contas within a date range', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }] });

    const result = await contasReceberApi.pendentes('2026-01-01', '2026-01-31');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/contas-receber/pendentes', {
      params: { inicio: '2026-01-01', fim: '2026-01-31' },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('receber() POSTs to mark a conta as received', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'RECEBIDA' } });

    const result = await contasReceberApi.receber(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contas-receber/1/receber');
    expect(result.status).toBe('RECEBIDA');
  });

  it('cancelar() POSTs to cancel a conta', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'CANCELADA' } });

    const result = await contasReceberApi.cancelar(1);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/contas-receber/1/cancelar');
    expect(result.status).toBe('CANCELADA');
  });
});
