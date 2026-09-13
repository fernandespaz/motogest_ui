import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { OrdemServicoRequest, OrdemServicoResponse, OrdemServicoStatus, PageParams } from '../types';

export type OrdensServicoListParams = PageParams & {
  status?: OrdemServicoStatus;
  numero?: string;
  usuarioResponsavelId?: number;
};

const base = createCrudApi<OrdemServicoResponse, OrdemServicoRequest, OrdensServicoListParams>(
  API_ROUTES.ordensServico.base,
);

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
  // Aberta -> Aguardando Aprovação — gera/renova o link público que o cliente
  // usa pra aprovar a OS antes do técnico poder iniciar o cronômetro.
  enviar: (id: number) => apiClient.post<OrdemServicoResponse>(API_ROUTES.ordensServico.enviar(id)).then((r) => r.data),
  // Aprovada -> Em Andamento
  timerStart: (id: number) =>
    apiClient.post<OrdemServicoResponse>(API_ROUTES.ordensServico.timerStart(id)).then((r) => r.data),
  // Em Andamento -> Pausada — motivo é obrigatório no backend
  timerPause: (id: number, motivo: string) =>
    apiClient
      .post<OrdemServicoResponse>(API_ROUTES.ordensServico.timerPause(id), { motivo })
      .then((r) => r.data),
  // Pausada -> Em Andamento
  timerResume: (id: number) =>
    apiClient.post<OrdemServicoResponse>(API_ROUTES.ordensServico.timerResume(id)).then((r) => r.data),
  // PDF is rendered client-side (see features/ordens-servico/ordemServicoPdf.ts) — the
  // backend endpoint is a bare text placeholder with no layout or client/vehicle data.
};
