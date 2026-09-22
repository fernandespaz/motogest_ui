import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  AuditoriaParametroFinanceiroResponse,
  CustoFixoRequest,
  CustoFixoResponse,
  HoraTecnicaResponse,
  PageParams,
  PageResponse,
  ParametrosHoraTecnicaRequest,
} from '../types';

export const horaTecnicaApi = {
  // A composição só vem preenchida pra quem tem HORA_TECNICA_GERENCIAR — o
  // backend redige o resto; o front nunca precisa esconder campo por conta.
  consultar: () => apiClient.get<HoraTecnicaResponse>(API_ROUTES.horaTecnica.base).then((r) => r.data),
  atualizarParametros: (payload: ParametrosHoraTecnicaRequest) =>
    apiClient.put<HoraTecnicaResponse>(API_ROUTES.horaTecnica.parametros, payload).then((r) => r.data),
  listarCustosFixos: () =>
    apiClient.get<CustoFixoResponse[]>(API_ROUTES.horaTecnica.custosFixos).then((r) => r.data),
  criarCustoFixo: (payload: CustoFixoRequest) =>
    apiClient.post<CustoFixoResponse>(API_ROUTES.horaTecnica.custosFixos, payload).then((r) => r.data),
  atualizarCustoFixo: (id: number, payload: CustoFixoRequest) =>
    apiClient.put<CustoFixoResponse>(API_ROUTES.horaTecnica.custoFixo(id), payload).then((r) => r.data),
  excluirCustoFixo: (id: number) =>
    apiClient.delete<void>(API_ROUTES.horaTecnica.custoFixo(id)).then((r) => r.data),
  auditoria: (params?: PageParams) =>
    apiClient
      .get<PageResponse<AuditoriaParametroFinanceiroResponse>>(API_ROUTES.horaTecnica.auditoria, { params })
      .then((r) => r.data),
};
