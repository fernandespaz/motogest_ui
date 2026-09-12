import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { ProdutoRequest, ProdutoResponse } from '../types';

const base = createCrudApi<ProdutoResponse, ProdutoRequest>(API_ROUTES.produtos.base);

export const produtosApi = {
  ...base,
  abaixoDoMinimo: () => apiClient.get<ProdutoResponse[]>(API_ROUTES.produtos.abaixoDoMinimo).then((r) => r.data),
};
