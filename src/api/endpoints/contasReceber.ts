import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { ContaReceberRequest, ContaReceberResponse } from '../types';

const base = createCrudApi<ContaReceberResponse, ContaReceberRequest>(API_ROUTES.contasReceber.base);

export const contasReceberApi = {
  ...base,
  pendentes: (inicio: string, fim: string) =>
    apiClient
      .get<ContaReceberResponse[]>(API_ROUTES.contasReceber.pendentes, { params: { inicio, fim } })
      .then((r) => r.data),
  receber: (id: number) =>
    apiClient.post<ContaReceberResponse>(API_ROUTES.contasReceber.receber(id)).then((r) => r.data),
  cancelar: (id: number) =>
    apiClient.post<ContaReceberResponse>(API_ROUTES.contasReceber.cancelar(id)).then((r) => r.data),
};
