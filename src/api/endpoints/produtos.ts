import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import type { ProdutoRequest, ProdutoResponse } from '../types';

const base = createCrudApi<ProdutoResponse, ProdutoRequest>('/api/v1/produtos');

export const produtosApi = {
  ...base,
  abaixoDoMinimo: () => apiClient.get<ProdutoResponse[]>('/api/v1/produtos/abaixo-do-minimo').then((r) => r.data),
};
