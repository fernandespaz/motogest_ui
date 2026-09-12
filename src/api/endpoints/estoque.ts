import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { MovimentacaoEstoqueRequest, MovimentacaoEstoqueResponse, PageParams, PageResponse } from '../types';

export const estoqueApi = {
  list: (params?: PageParams) =>
    apiClient
      .get<PageResponse<MovimentacaoEstoqueResponse>>(API_ROUTES.estoque.base, { params })
      .then((r) => r.data),
  listPorProduto: (produtoId: number, params?: PageParams) =>
    apiClient
      .get<PageResponse<MovimentacaoEstoqueResponse>>(API_ROUTES.estoque.porProduto(produtoId), { params })
      .then((r) => r.data),
  registrar: (produtoId: number, payload: MovimentacaoEstoqueRequest) =>
    apiClient
      .post<MovimentacaoEstoqueResponse>(API_ROUTES.estoque.porProduto(produtoId), payload)
      .then((r) => r.data),
};
