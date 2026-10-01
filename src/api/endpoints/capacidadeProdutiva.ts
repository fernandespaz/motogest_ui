import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  AuditoriaParametroFinanceiroResponse,
  CapacidadeProdutivaRequest,
  CapacidadeProdutivaResponse,
  PageParams,
  PageResponse,
} from '../types';

export const capacidadeProdutivaApi = {
  consultar: () =>
    apiClient.get<CapacidadeProdutivaResponse>(API_ROUTES.capacidadeProdutiva.base).then((r) => r.data),
  atualizar: (payload: CapacidadeProdutivaRequest) =>
    apiClient.put<CapacidadeProdutivaResponse>(API_ROUTES.capacidadeProdutiva.base, payload).then((r) => r.data),
  auditoria: (params?: PageParams) =>
    apiClient
      .get<PageResponse<AuditoriaParametroFinanceiroResponse>>(API_ROUTES.capacidadeProdutiva.auditoria, { params })
      .then((r) => r.data),
};
