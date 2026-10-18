import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { BaixaContaRequest, ContaPagarLoteRequest, ContaPagarRequest, ContaPagarResponse } from '../types';

const base = createCrudApi<ContaPagarResponse, ContaPagarRequest>(API_ROUTES.contasPagar.base);

export const contasPagarApi = {
  ...base,
  pendentes: (inicio: string, fim: string) =>
    apiClient
      .get<ContaPagarResponse[]>(API_ROUTES.contasPagar.pendentes, { params: { inicio, fim } })
      .then((r) => r.data),
  criarLote: (payload: ContaPagarLoteRequest) =>
    apiClient.post<ContaPagarResponse[]>(API_ROUTES.contasPagar.lote, payload).then((r) => r.data),
  // O corpo é opcional no backend: sem ele a baixa é de hoje, pelo valor da conta, sem forma de pagamento.
  pagar: (id: number, baixa?: BaixaContaRequest) =>
    apiClient.post<ContaPagarResponse>(API_ROUTES.contasPagar.pagar(id), baixa).then((r) => r.data),
  cancelar: (id: number) =>
    apiClient.post<ContaPagarResponse>(API_ROUTES.contasPagar.cancelar(id)).then((r) => r.data),
};
