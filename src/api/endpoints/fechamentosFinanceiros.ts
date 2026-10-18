import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { FechamentoFinanceiroRequest, FechamentoFinanceiroResponse, ReaberturaFinanceiraRequest, SituacaoFechamentoResponse } from '../types';

export const fechamentosFinanceirosApi = {
  situacao: () => apiClient.get<SituacaoFechamentoResponse>(API_ROUTES.fechamentosFinanceiros.situacao).then((r) => r.data),
  listar: () => apiClient.get<FechamentoFinanceiroResponse[]>(API_ROUTES.fechamentosFinanceiros.base).then((r) => r.data),
  fechar: (payload: FechamentoFinanceiroRequest) =>
    apiClient.post<FechamentoFinanceiroResponse>(API_ROUTES.fechamentosFinanceiros.base, payload).then((r) => r.data),
  reabrir: (id: number, payload: ReaberturaFinanceiraRequest) =>
    apiClient.post<FechamentoFinanceiroResponse>(API_ROUTES.fechamentosFinanceiros.reabrir(id), payload).then((r) => r.data),
};
