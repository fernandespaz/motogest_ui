import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { OrdemServicoRequest, OrdemServicoResponse, OrdemServicoStatus, PageParams } from '../types';

type ListParams = PageParams & { status?: OrdemServicoStatus };

const base = createCrudApi<OrdemServicoResponse, OrdemServicoRequest, ListParams>(API_ROUTES.ordensServico.base);

export const ordensServicoApi = {
  ...base,
  criarAPartirDeOrcamento: (orcamentoId: number, usuarioResponsavelId?: number) =>
    apiClient
      .post<OrdemServicoResponse>(API_ROUTES.ordensServico.aPartirDeOrcamento(orcamentoId), null, {
        params: { usuarioResponsavelId },
      })
      .then((r) => r.data),
  atualizarStatus: (id: number, status: OrdemServicoStatus) =>
    apiClient
      .patch<OrdemServicoResponse>(API_ROUTES.ordensServico.status(id), null, { params: { status } })
      .then((r) => r.data),
  // PDF is rendered client-side (see features/ordens-servico/ordemServicoPdf.ts) — the
  // backend endpoint is a bare text placeholder with no layout or client/vehicle data.
};
