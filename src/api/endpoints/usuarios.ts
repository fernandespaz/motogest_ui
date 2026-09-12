import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { UsuarioRequest, UsuarioResponse } from '../types';

export const usuariosApi = {
  list: () => apiClient.get<UsuarioResponse[]>(API_ROUTES.usuarios.base).then((r) => r.data),
  get: (id: number) => apiClient.get<UsuarioResponse>(`${API_ROUTES.usuarios.base}/${id}`).then((r) => r.data),
  create: (payload: UsuarioRequest) =>
    apiClient.post<UsuarioResponse>(API_ROUTES.usuarios.base, payload).then((r) => r.data),
  update: (id: number, payload: UsuarioRequest) =>
    apiClient.put<UsuarioResponse>(`${API_ROUTES.usuarios.base}/${id}`, payload).then((r) => r.data),
  remove: (id: number) => apiClient.delete<void>(`${API_ROUTES.usuarios.base}/${id}`).then((r) => r.data),
};
