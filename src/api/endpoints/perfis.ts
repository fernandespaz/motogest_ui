import { apiClient } from '../client';
import type { PerfilRequest, PerfilResponse, PermissaoResponse } from '../types';

export const perfisApi = {
  list: () => apiClient.get<PerfilResponse[]>('/api/v1/perfis').then((r) => r.data),
  get: (id: number) => apiClient.get<PerfilResponse>(`/api/v1/perfis/${id}`).then((r) => r.data),
  create: (payload: PerfilRequest) => apiClient.post<PerfilResponse>('/api/v1/perfis', payload).then((r) => r.data),
  update: (id: number, payload: PerfilRequest) =>
    apiClient.put<PerfilResponse>(`/api/v1/perfis/${id}`, payload).then((r) => r.data),
  remove: (id: number) => apiClient.delete<void>(`/api/v1/perfis/${id}`).then((r) => r.data),
  permissoesDisponiveis: () =>
    apiClient.get<PermissaoResponse[]>('/api/v1/perfis/permissoes-disponiveis').then((r) => r.data),
};
