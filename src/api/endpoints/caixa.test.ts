import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { caixaApi } from './caixa';

vi.mock('../client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('caixaApi', () => {
  it('list() GETs paginated movimentos', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });

    await caixaApi.list({ page: 0, size: 20 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/movimentos', { params: { page: 0, size: 20 } });
  });

  it('periodo() GETs movimentos within a date range', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 1 }] });

    const result = await caixaApi.periodo('2026-01-01', '2026-01-31');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/movimentos/periodo', {
      params: { inicio: '2026-01-01', fim: '2026-01-31' },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('saldo() GETs and unwraps the saldo number', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { saldo: 1234.5 } });

    const result = await caixaApi.saldo('2026-01-01', '2026-01-31');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/caixa/saldo', {
      params: { inicio: '2026-01-01', fim: '2026-01-31' },
    });
    expect(result).toBe(1234.5);
  });

  it('registrar() POSTs a new movimento', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });

    await caixaApi.registrar({ tipo: 'ENTRADA', valor: 100 } as never);

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/caixa/movimentos', { tipo: 'ENTRADA', valor: 100 });
  });
});
