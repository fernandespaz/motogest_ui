import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { ContaPagarRequest, ContaPagarResponse } from '../types';

const base = createCrudApi<ContaPagarResponse, ContaPagarRequest>(API_ROUTES.contasPagar.base);

export const contasPagarApi = {
  ...base,
  pendentes: (inicio: string, fim: string) =>
    apiClient
      .get<ContaPagarResponse[]>(API_ROUTES.contasPagar.pendentes, { params: { inicio, fim } })
      .then((r) => r.data),
  pagar: (id: number) => apiClient.post<ContaPagarResponse>(API_ROUTES.contasPagar.pagar(id)).then((r) => r.data),
  cancelar: (id: number) =>
    apiClient.post<ContaPagarResponse>(API_ROUTES.contasPagar.cancelar(id)).then((r) => r.data),
};
