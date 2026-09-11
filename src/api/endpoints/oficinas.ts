import { apiClient } from '../client';
import type { OficinaRegistrationRequest, OficinaResponse, OficinaUpdateRequest } from '../types';

export const oficinasApi = {
  atual: () => apiClient.get<OficinaResponse>('/api/v1/oficinas/atual').then((r) => r.data),
  atualizar: (payload: OficinaUpdateRequest) =>
    apiClient.put<OficinaResponse>('/api/v1/oficinas/atual', payload).then((r) => r.data),
  registrar: (payload: OficinaRegistrationRequest) =>
    apiClient.post<OficinaResponse>('/api/v1/oficinas/registrar', payload).then((r) => r.data),
};
