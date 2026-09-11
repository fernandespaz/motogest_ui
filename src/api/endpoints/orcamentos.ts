import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import type { OrcamentoRequest, OrcamentoResponse } from '../types';

const base = createCrudApi<OrcamentoResponse, OrcamentoRequest>('/api/v1/orcamentos');

export const orcamentosApi = {
  ...base,
  enviar: (id: number) => apiClient.post<OrcamentoResponse>(`/api/v1/orcamentos/${id}/enviar`).then((r) => r.data),
  aprovar: (id: number) => apiClient.post<OrcamentoResponse>(`/api/v1/orcamentos/${id}/aprovar`).then((r) => r.data),
  rejeitar: (id: number) => apiClient.post<OrcamentoResponse>(`/api/v1/orcamentos/${id}/rejeitar`).then((r) => r.data),
  pdf: (id: number) =>
    apiClient.get(`/api/v1/orcamentos/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data as Blob),
};
