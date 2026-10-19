import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { ParametroFinanceiroRequest, ParametroFinanceiroResponse } from '../types';

export const parametrosFinanceirosApi = {
  buscar: () => apiClient.get<ParametroFinanceiroResponse>(API_ROUTES.parametrosFinanceiros.base).then((r) => r.data),
  atualizar: (payload: ParametroFinanceiroRequest) =>
    apiClient.put<ParametroFinanceiroResponse>(API_ROUTES.parametrosFinanceiros.base, payload).then((r) => r.data),
};
