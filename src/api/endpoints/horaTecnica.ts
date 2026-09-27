import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  AuditoriaParametroFinanceiroResponse,
  CategoriaHoraTecnicaRequest,
  CategoriaHoraTecnicaResponse,
  PageParams,
  PageResponse,
} from '../types';

export const horaTecnicaApi = {
  // Lista as 3 categorias (A/B/C) — pode vir vazia se a oficina ainda não configurou nada.
  consultar: () =>
    apiClient.get<CategoriaHoraTecnicaResponse[]>(API_ROUTES.horaTecnica.base).then((r) => r.data),
  // Upsert das 3 categorias de uma vez + arredondamento comercial (auditado).
  atualizar: (payload: CategoriaHoraTecnicaRequest) =>
    apiClient.put<CategoriaHoraTecnicaResponse[]>(API_ROUTES.horaTecnica.base, payload).then((r) => r.data),
  auditoria: (params?: PageParams) =>
    apiClient
      .get<PageResponse<AuditoriaParametroFinanceiroResponse>>(API_ROUTES.horaTecnica.auditoria, { params })
      .then((r) => r.data),
};
