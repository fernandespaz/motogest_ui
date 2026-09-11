import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import type { ContaPagarRequest, ContaPagarResponse } from '../types';

const base = createCrudApi<ContaPagarResponse, ContaPagarRequest>('/api/v1/contas-pagar');

export const contasPagarApi = {
  ...base,
  pendentes: (inicio: string, fim: string) =>
    apiClient
      .get<ContaPagarResponse[]>('/api/v1/contas-pagar/pendentes', { params: { inicio, fim } })
      .then((r) => r.data),
  pagar: (id: number) => apiClient.post<ContaPagarResponse>(`/api/v1/contas-pagar/${id}/pagar`).then((r) => r.data),
  cancelar: (id: number) =>
    apiClient.post<ContaPagarResponse>(`/api/v1/contas-pagar/${id}/cancelar`).then((r) => r.data),
};
