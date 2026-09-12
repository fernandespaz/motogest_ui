import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { CaixaMovimentoRequest, CaixaMovimentoResponse, PageParams, PageResponse } from '../types';

export const caixaApi = {
  list: (params?: PageParams) =>
    apiClient.get<PageResponse<CaixaMovimentoResponse>>(API_ROUTES.caixa.movimentos, { params }).then((r) => r.data),
  periodo: (inicio: string, fim: string) =>
    apiClient
      .get<CaixaMovimentoResponse[]>(API_ROUTES.caixa.periodo, { params: { inicio, fim } })
      .then((r) => r.data),
  saldo: (inicio: string, fim: string) =>
    apiClient
      .get<{ saldo: number }>(API_ROUTES.caixa.saldo, { params: { inicio, fim } })
      .then((r) => r.data.saldo),
  registrar: (payload: CaixaMovimentoRequest) =>
    apiClient.post<CaixaMovimentoResponse>(API_ROUTES.caixa.movimentos, payload).then((r) => r.data),
};
