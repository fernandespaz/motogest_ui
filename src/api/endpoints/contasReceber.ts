import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import type { ContaReceberRequest, ContaReceberResponse } from '../types';

const base = createCrudApi<ContaReceberResponse, ContaReceberRequest>('/api/v1/contas-receber');

export const contasReceberApi = {
  ...base,
  pendentes: (inicio: string, fim: string) =>
    apiClient
      .get<ContaReceberResponse[]>('/api/v1/contas-receber/pendentes', { params: { inicio, fim } })
      .then((r) => r.data),
  receber: (id: number) =>
    apiClient.post<ContaReceberResponse>(`/api/v1/contas-receber/${id}/receber`).then((r) => r.data),
  cancelar: (id: number) =>
    apiClient.post<ContaReceberResponse>(`/api/v1/contas-receber/${id}/cancelar`).then((r) => r.data),
};
