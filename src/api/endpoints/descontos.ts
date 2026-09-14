import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  OrigemDesconto,
  PageParams,
  PageResponse,
  RejeitarSolicitacaoDescontoRequest,
  SolicitacaoDescontoRequest,
  SolicitacaoDescontoResponse,
  StatusDesconto,
} from '../types';

export interface DescontosListParams extends PageParams {
  origemTipo?: OrigemDesconto;
  origemId?: number;
  status?: StatusDesconto;
}

export const descontosApi = {
  list: (params?: DescontosListParams) =>
    apiClient
      .get<PageResponse<SolicitacaoDescontoResponse>>(API_ROUTES.descontos.base, { params })
      .then((r) => r.data),
  get: (id: number) =>
    apiClient.get<SolicitacaoDescontoResponse>(API_ROUTES.descontos.detail(id)).then((r) => r.data),
  solicitar: (payload: SolicitacaoDescontoRequest) =>
    apiClient.post<SolicitacaoDescontoResponse>(API_ROUTES.descontos.base, payload).then((r) => r.data),
  aprovar: (id: number) =>
    apiClient.post<SolicitacaoDescontoResponse>(API_ROUTES.descontos.aprovar(id)).then((r) => r.data),
  rejeitar: (id: number, payload: RejeitarSolicitacaoDescontoRequest) =>
    apiClient.post<SolicitacaoDescontoResponse>(API_ROUTES.descontos.rejeitar(id), payload).then((r) => r.data),
};
