import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  ChavePublicaResponse,
  IniciarAssinaturaRequest,
  IniciarPedidoRequest,
  IniciarPixRequest,
  PagamentoResponse,
} from '../types';

export const pagamentosApi = {
  iniciarPedido: (payload: IniciarPedidoRequest) =>
    apiClient.post<PagamentoResponse>(API_ROUTES.pagamentos.pedido, payload).then((r) => r.data),
  iniciarAssinatura: (payload: IniciarAssinaturaRequest) =>
    apiClient.post<PagamentoResponse>(API_ROUTES.pagamentos.assinatura, payload).then((r) => r.data),
  iniciarPix: (payload: IniciarPixRequest) =>
    apiClient.post<PagamentoResponse>(API_ROUTES.pagamentos.pix, payload).then((r) => r.data),
  chavePublica: () => apiClient.get<ChavePublicaResponse>(API_ROUTES.pagamentos.chavePublica).then((r) => r.data),
};
