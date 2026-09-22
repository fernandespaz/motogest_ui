import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { PageParams, ProdutoCategoria, ProdutoRequest, ProdutoResponse } from '../types';

export type ProdutosListParams = PageParams & { categoria?: ProdutoCategoria; busca?: string };
export type ProdutosAbaixoDoMinimoParams = { categoria?: ProdutoCategoria };

const base = createCrudApi<ProdutoResponse, ProdutoRequest, ProdutosListParams>(API_ROUTES.produtos.base);

export const produtosApi = {
  ...base,
  abaixoDoMinimo: (params?: ProdutosAbaixoDoMinimoParams) =>
    apiClient.get<ProdutoResponse[]>(API_ROUTES.produtos.abaixoDoMinimo, { params }).then((r) => r.data),
};
