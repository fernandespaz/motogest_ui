import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { PerfilRequest, PerfilResponse, PermissaoResponse } from '../types';

export const perfisApi = {
  list: () => apiClient.get<PerfilResponse[]>(API_ROUTES.perfis.base).then((r) => r.data),
  get: (id: number) => apiClient.get<PerfilResponse>(`${API_ROUTES.perfis.base}/${id}`).then((r) => r.data),
  create: (payload: PerfilRequest) =>
    apiClient.post<PerfilResponse>(API_ROUTES.perfis.base, payload).then((r) => r.data),
  update: (id: number, payload: PerfilRequest) =>
    apiClient.put<PerfilResponse>(`${API_ROUTES.perfis.base}/${id}`, payload).then((r) => r.data),
  remove: (id: number) => apiClient.delete<void>(`${API_ROUTES.perfis.base}/${id}`).then((r) => r.data),
  permissoesDisponiveis: () =>
    apiClient.get<PermissaoResponse[]>(API_ROUTES.perfis.permissoesDisponiveis).then((r) => r.data),
};
