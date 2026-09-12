import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { FotoRequest, FotoResponse } from '../types';

export const fotosApi = {
  list: (ordemServicoId: number) =>
    apiClient.get<FotoResponse[]>(API_ROUTES.fotos.base(ordemServicoId)).then((r) => r.data),
  adicionar: (ordemServicoId: number, payload: FotoRequest) =>
    apiClient.post<FotoResponse>(API_ROUTES.fotos.base(ordemServicoId), payload).then((r) => r.data),
  remover: (id: number) => apiClient.delete<void>(API_ROUTES.fotos.remover(id)).then((r) => r.data),
};
