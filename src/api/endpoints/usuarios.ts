import { apiClient } from '../client';
import type { UsuarioRequest, UsuarioResponse } from '../types';

export const usuariosApi = {
  list: () => apiClient.get<UsuarioResponse[]>('/api/v1/usuarios').then((r) => r.data),
  get: (id: number) => apiClient.get<UsuarioResponse>(`/api/v1/usuarios/${id}`).then((r) => r.data),
  create: (payload: UsuarioRequest) =>
    apiClient.post<UsuarioResponse>('/api/v1/usuarios', payload).then((r) => r.data),
  update: (id: number, payload: UsuarioRequest) =>
    apiClient.put<UsuarioResponse>(`/api/v1/usuarios/${id}`, payload).then((r) => r.data),
  remove: (id: number) => apiClient.delete<void>(`/api/v1/usuarios/${id}`).then((r) => r.data),
};
