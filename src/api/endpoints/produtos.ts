import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { PageParams, ProdutoCategoria, ProdutoImagemResponse, ProdutoRequest, ProdutoResponse } from '../types';

export type ProdutosListParams = PageParams & { categoria?: ProdutoCategoria; busca?: string };
export type ProdutosAbaixoDoMinimoParams = { categoria?: ProdutoCategoria };

const base = createCrudApi<ProdutoResponse, ProdutoRequest, ProdutosListParams>(API_ROUTES.produtos.base);

export const produtosApi = {
  ...base,
  abaixoDoMinimo: (params?: ProdutosAbaixoDoMinimoParams) =>
    apiClient.get<ProdutoResponse[]>(API_ROUTES.produtos.abaixoDoMinimo, { params }).then((r) => r.data),
  // PUT multipart (campo 'arquivo'). O Content-Type fica por conta do browser
  // (com o boundary) — o 'application/json' padrão do apiClient quebraria o upload.
  enviarImagem: (id: number, arquivo: File) => {
    const formData = new FormData();
    formData.append('arquivo', arquivo);
    return apiClient
      .put<ProdutoImagemResponse>(API_ROUTES.produtos.imagem(id), formData, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data);
  },
  removerImagem: (id: number) => apiClient.delete<void>(API_ROUTES.produtos.imagem(id)).then((r) => r.data),
  // Rota autenticada por JWT: <img src> puro não manda o Authorization, então
  // a foto chega como blob via apiClient (o backend responde com ETag/cache imutável).
  buscarImagemBlob: (id: number) =>
    apiClient.get<Blob>(API_ROUTES.produtos.imagem(id), { responseType: 'blob' }).then((r) => r.data),
};
