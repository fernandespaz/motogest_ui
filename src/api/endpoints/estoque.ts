import { apiClient } from '../client';
import type { MovimentacaoEstoqueRequest, MovimentacaoEstoqueResponse, PageParams, PageResponse } from '../types';

export const estoqueApi = {
  list: (params?: PageParams) =>
    apiClient
      .get<PageResponse<MovimentacaoEstoqueResponse>>('/api/v1/movimentacoes-estoque', { params })
      .then((r) => r.data),
  listPorProduto: (produtoId: number, params?: PageParams) =>
    apiClient
      .get<PageResponse<MovimentacaoEstoqueResponse>>(`/api/v1/produtos/${produtoId}/movimentacoes`, { params })
      .then((r) => r.data),
  registrar: (produtoId: number, payload: MovimentacaoEstoqueRequest) =>
    apiClient
      .post<MovimentacaoEstoqueResponse>(`/api/v1/produtos/${produtoId}/movimentacoes`, payload)
      .then((r) => r.data),
};
