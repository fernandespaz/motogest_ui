import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { IniciarAssinaturaRequest, IniciarPedidoRequest, PagamentoResponse } from '../types';

export const pagamentosApi = {
  iniciarPedido: (payload: IniciarPedidoRequest) =>
    apiClient.post<PagamentoResponse>(API_ROUTES.pagamentos.pedido, payload).then((r) => r.data),
  iniciarAssinatura: (payload: IniciarAssinaturaRequest) =>
    apiClient.post<PagamentoResponse>(API_ROUTES.pagamentos.assinatura, payload).then((r) => r.data),
};
