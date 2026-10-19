import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { CategoriaFinanceiraRequest, CategoriaFinanceiraResponse, TipoCategoriaFinanceira } from '../types';

export interface CategoriasFinanceirasParams {
  tipo?: TipoCategoriaFinanceira;
  /** A tela de gestão precisa ver também as desativadas; as listas de escolha, não. */
  incluirInativas?: boolean;
}

export const categoriasFinanceirasApi = {
  listar: (params?: CategoriasFinanceirasParams) =>
    apiClient
      .get<CategoriaFinanceiraResponse[]>(API_ROUTES.categoriasFinanceiras.base, { params })
      .then((r) => r.data),
  criar: (payload: CategoriaFinanceiraRequest) =>
    apiClient.post<CategoriaFinanceiraResponse>(API_ROUTES.categoriasFinanceiras.base, payload).then((r) => r.data),
  atualizar: (id: number, payload: CategoriaFinanceiraRequest) =>
    apiClient
      .put<CategoriaFinanceiraResponse>(`${API_ROUTES.categoriasFinanceiras.base}/${id}`, payload)
      .then((r) => r.data),
};
