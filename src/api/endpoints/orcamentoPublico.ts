import { publicApiClient } from '../publicClient';
import { API_ROUTES } from '../routes';
import type { OrcamentoPublicoResponse } from '../types';

/**
 * Sem autenticação — é a página que o cliente final abre a partir do link
 * compartilhado (WhatsApp, e-mail). O token na URL é o único "segredo".
 */
export const orcamentoPublicoApi = {
  buscar: (token: string) =>
    publicApiClient.get<OrcamentoPublicoResponse>(API_ROUTES.orcamentosPublico.buscar(token)).then((r) => r.data),
  aprovar: (token: string) =>
    publicApiClient.post<OrcamentoPublicoResponse>(API_ROUTES.orcamentosPublico.aprovar(token)).then((r) => r.data),
  rejeitar: (token: string) =>
    publicApiClient.post<OrcamentoPublicoResponse>(API_ROUTES.orcamentosPublico.rejeitar(token)).then((r) => r.data),
};
