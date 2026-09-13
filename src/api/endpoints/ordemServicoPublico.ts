import { publicApiClient } from '../publicClient';
import { API_ROUTES } from '../routes';
import type { OrdemServicoPublicoResponse } from '../types';

/**
 * Sem autenticação — a página que o cliente final abre a partir do link
 * compartilhado (WhatsApp, e-mail) pra aprovar a OS antes do técnico iniciar
 * o serviço. O token na URL é o único "segredo".
 */
export const ordemServicoPublicoApi = {
  buscar: (token: string) =>
    publicApiClient
      .get<OrdemServicoPublicoResponse>(API_ROUTES.ordensServicoPublico.buscar(token))
      .then((r) => r.data),
  aprovar: (token: string) =>
    publicApiClient
      .post<OrdemServicoPublicoResponse>(API_ROUTES.ordensServicoPublico.aprovar(token))
      .then((r) => r.data),
  rejeitar: (token: string) =>
    publicApiClient
      .post<OrdemServicoPublicoResponse>(API_ROUTES.ordensServicoPublico.rejeitar(token))
      .then((r) => r.data),
};
