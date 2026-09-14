import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { PageParams, PageResponse, ReservaEstoqueResponse, ReservarEstoqueRequest } from '../types';

export interface ReservasEstoqueListParams extends PageParams {}

export const reservasEstoqueApi = {
  list: (params?: ReservasEstoqueListParams) =>
    apiClient
      .get<PageResponse<ReservaEstoqueResponse>>(API_ROUTES.reservasEstoque.base, { params })
      .then((r) => r.data),
  reservar: (produtoId: number, payload: ReservarEstoqueRequest) =>
    apiClient
      .post<ReservaEstoqueResponse>(API_ROUTES.reservasEstoque.reservarProduto(produtoId), payload)
      .then((r) => r.data),
  liberar: (id: number) =>
    apiClient.post<ReservaEstoqueResponse>(API_ROUTES.reservasEstoque.liberar(id)).then((r) => r.data),
};
