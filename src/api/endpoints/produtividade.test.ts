import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { produtividadeApi } from './produtividade';

vi.mock('../client', () => ({ apiClient: { get: vi.fn() } }));

describe('produtividadeApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consultores() GETs the monthly report for the given month', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { mes: '2026-09' } });
    const result = await produtividadeApi.consultores('2026-09');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtividade/consultores', { params: { mes: '2026-09' } });
    expect(result).toEqual({ mes: '2026-09' });
  });

  it('consultor() GETs one consultor detail for the given month', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { usuarioId: 7 } });
    await produtividadeApi.consultor(7, '2026-08');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/produtividade/consultores/7', { params: { mes: '2026-08' } });
  });
});
