import { apiClient } from '../client';
import type { FotoRequest, FotoResponse } from '../types';

export const fotosApi = {
  list: (ordemServicoId: number) =>
    apiClient.get<FotoResponse[]>(`/api/v1/ordens-servico/${ordemServicoId}/fotos`).then((r) => r.data),
  adicionar: (ordemServicoId: number, payload: FotoRequest) =>
    apiClient.post<FotoResponse>(`/api/v1/ordens-servico/${ordemServicoId}/fotos`, payload).then((r) => r.data),
  remover: (id: number) => apiClient.delete<void>(`/api/v1/fotos/${id}`).then((r) => r.data),
};
