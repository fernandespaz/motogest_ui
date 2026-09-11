import { apiClient } from '../client';
import type { CaixaMovimentoRequest, CaixaMovimentoResponse, PageParams, PageResponse } from '../types';

export const caixaApi = {
  list: (params?: PageParams) =>
    apiClient.get<PageResponse<CaixaMovimentoResponse>>('/api/v1/caixa/movimentos', { params }).then((r) => r.data),
  periodo: (inicio: string, fim: string) =>
    apiClient
      .get<CaixaMovimentoResponse[]>('/api/v1/caixa/movimentos/periodo', { params: { inicio, fim } })
      .then((r) => r.data),
  saldo: (inicio: string, fim: string) =>
    apiClient.get<number>('/api/v1/caixa/saldo', { params: { inicio, fim } }).then((r) => r.data),
  registrar: (payload: CaixaMovimentoRequest) =>
    apiClient.post<CaixaMovimentoResponse>('/api/v1/caixa/movimentos', payload).then((r) => r.data),
};
