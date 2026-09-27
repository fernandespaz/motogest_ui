import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { horaTecnicaApi } from './horaTecnica';

vi.mock('../client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('horaTecnicaApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consultar() GETs the categories', async () => {
    const categorias = [{ categoria: 'A' as const, valorHora: 80, arredondamentoComercial: 5 }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: categorias });
    const result = await horaTecnicaApi.consultar();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica');
    expect(result).toEqual(categorias);
  });

  it('atualizar() PUTs all 3 categories at once', async () => {
    const payload = {
      categorias: [
        { categoria: 'A' as const, valorHora: 80 },
        { categoria: 'B' as const, valorHora: 100 },
        { categoria: 'C' as const, valorHora: 130 },
      ],
      arredondamentoComercial: 5,
    };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: [] });
    await horaTecnicaApi.atualizar(payload);
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica', payload);
  });

  it('auditoria() forwards pagination params', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await horaTecnicaApi.auditoria({ page: 2, size: 10 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica/auditoria', {
      params: { page: 2, size: 10 },
    });
  });
});
