import { createCrudApi } from '../crud';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { OrcamentoRequest, OrcamentoResponse } from '../types';

const base = createCrudApi<OrcamentoResponse, OrcamentoRequest>(API_ROUTES.orcamentos.base);

export const orcamentosApi = {
  ...base,
  enviar: (id: number) => apiClient.post<OrcamentoResponse>(API_ROUTES.orcamentos.enviar(id)).then((r) => r.data),
  aprovar: (id: number) => apiClient.post<OrcamentoResponse>(API_ROUTES.orcamentos.aprovar(id)).then((r) => r.data),
  rejeitar: (id: number) => apiClient.post<OrcamentoResponse>(API_ROUTES.orcamentos.rejeitar(id)).then((r) => r.data),
  // PDF is rendered client-side (see features/orcamentos/orcamentoPdf.ts) — the
  // backend endpoint is a bare text placeholder with no layout or client/vehicle data.
};
