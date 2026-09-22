import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';
import { horaTecnicaApi } from './horaTecnica';

vi.mock('../client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('horaTecnicaApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consultar() GETs the PHT', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { configurado: true, precoHoraTecnica: 150 } });
    const result = await horaTecnicaApi.consultar();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica');
    expect(result).toEqual({ configurado: true, precoHoraTecnica: 150 });
  });

  it('atualizarParametros() PUTs to /parametros', async () => {
    const payload = {
      numeroMecanicos: 2,
      horasPorDia: 8,
      diasUteisMes: 22,
      eficienciaPercentual: 80,
      impostosPercentual: 10,
      margemLucroPercentual: 20,
    };
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: {} });
    await horaTecnicaApi.atualizarParametros(payload);
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica/parametros', payload);
  });

  it('CRUDs custos fixos on /custos-fixos', async () => {
    const payload = { categoria: 'ALUGUEL' as const, descricao: 'Galpão', valorMensal: 3000 };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 1 } });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await horaTecnicaApi.listarCustosFixos();
    await horaTecnicaApi.criarCustoFixo(payload);
    await horaTecnicaApi.atualizarCustoFixo(1, payload);
    await horaTecnicaApi.excluirCustoFixo(1);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica/custos-fixos');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica/custos-fixos', payload);
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica/custos-fixos/1', payload);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica/custos-fixos/1');
  });

  it('auditoria() forwards pagination params', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { content: [] } });
    await horaTecnicaApi.auditoria({ page: 2, size: 10 });
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/financeiro/hora-tecnica/auditoria', {
      params: { page: 2, size: 10 },
    });
  });
});
