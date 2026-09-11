import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import type { OrdemServicoRequest, OrdemServicoResponse, OrdemServicoStatus, PageParams } from '../types';

type ListParams = PageParams & { status?: OrdemServicoStatus };

const base = createCrudApi<OrdemServicoResponse, OrdemServicoRequest, ListParams>('/api/v1/ordens-servico');

export const ordensServicoApi = {
  ...base,
  criarAPartirDeOrcamento: (orcamentoId: number, usuarioResponsavelId?: number) =>
    apiClient
      .post<OrdemServicoResponse>(`/api/v1/ordens-servico/a-partir-de-orcamento/${orcamentoId}`, null, {
        params: { usuarioResponsavelId },
      })
      .then((r) => r.data),
  atualizarStatus: (id: number, status: OrdemServicoStatus) =>
    apiClient
      .patch<OrdemServicoResponse>(`/api/v1/ordens-servico/${id}/status`, null, { params: { status } })
      .then((r) => r.data),
  pdf: (id: number) =>
    apiClient.get(`/api/v1/ordens-servico/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data as Blob),
};
