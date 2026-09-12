import { apiClient } from '../client';
import { adminApiClient } from '../adminClient';
import { API_ROUTES } from '../routes';
import type {
  AdminOficinaResponse,
  OficinaRegistrationRequest,
  OficinaResponse,
  OficinaUpdateRequest,
  PageParams,
  PageResponse,
} from '../types';

export const oficinasApi = {
  atual: () => apiClient.get<OficinaResponse>(API_ROUTES.oficinas.atual).then((r) => r.data),
  atualizar: (payload: OficinaUpdateRequest) =>
    apiClient.put<OficinaResponse>(API_ROUTES.oficinas.atual, payload).then((r) => r.data),
};

/**
 * Console do root da plataforma (fora do fluxo de tenant). Cada chamada exige o
 * X-Admin-Token digitado pelo próprio root em tempo de execução — nunca embutido
 * no bundle (ver features/root/RootConsolePage.tsx).
 */
export const oficinasAdminApi = {
  list: (adminToken: string, params?: PageParams) =>
    adminApiClient
      .get<PageResponse<AdminOficinaResponse>>(API_ROUTES.oficinas.admin, {
        params,
        headers: { 'X-Admin-Token': adminToken },
      })
      .then((r) => r.data),
  criar: (adminToken: string, payload: OficinaRegistrationRequest) =>
    adminApiClient
      .post<OficinaResponse>(API_ROUTES.oficinas.admin, payload, { headers: { 'X-Admin-Token': adminToken } })
      .then((r) => r.data),
};
