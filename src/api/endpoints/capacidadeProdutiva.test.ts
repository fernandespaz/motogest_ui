import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { capacidadeProdutivaApi } from './capacidadeProdutiva';

vi.mock('../client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('capacidadeProdutivaApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consultar() GETs the current capacidade produtiva', async () => {
    const capacidade = { configurado: true, numeroMecanicos: 2, horasPorDia: 8, diasUteisMes: 22, eficienciaPercentual: 80, horasProdutivas: 281.6 };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: capacidade });
    const result = await capacidadeProdutivaApi.consultar();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/financeiro/capacidade-produtiva');
    expect(result).toEqual(capacidade);
  });

  it('atualizar() PUTs the new values', async () => {
    const payload = { numeroMecanicos: 3, horasPorDia: 8, diasUteisMes: 22, eficienciaPercentual: 85 };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { configurado: true, ...payload, horasProdutivas: 448.8 } });
    await capacidadeProdutivaApi.atualizar(payload);
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/financeiro/capacidade-produtiva', payload);
  });

  it('auditoria() forwards pagination params', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await capacidadeProdutivaApi.auditoria({ page: 1, size: 10 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/financeiro/capacidade-produtiva/auditoria', {
      params: { page: 1, size: 10 },
    });
  });
});
