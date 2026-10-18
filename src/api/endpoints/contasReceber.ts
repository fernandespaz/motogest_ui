import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { BaixaContaRequest, ContaReceberLoteRequest, ContaReceberRequest, ContaReceberResponse } from '../types';

const base = createCrudApi<ContaReceberResponse, ContaReceberRequest>(API_ROUTES.contasReceber.base);

export const contasReceberApi = {
  ...base,
  pendentes: (inicio: string, fim: string) =>
    apiClient
      .get<ContaReceberResponse[]>(API_ROUTES.contasReceber.pendentes, { params: { inicio, fim } })
      .then((r) => r.data),
  criarLote: (payload: ContaReceberLoteRequest) =>
    apiClient.post<ContaReceberResponse[]>(API_ROUTES.contasReceber.lote, payload).then((r) => r.data),
  // O corpo é opcional no backend: sem ele a baixa é de hoje, pelo valor da conta, sem forma de pagamento.
  receber: (id: number, baixa?: BaixaContaRequest) =>
    apiClient.post<ContaReceberResponse>(API_ROUTES.contasReceber.receber(id), baixa).then((r) => r.data),
  cancelar: (id: number) =>
    apiClient.post<ContaReceberResponse>(API_ROUTES.contasReceber.cancelar(id)).then((r) => r.data),
};
