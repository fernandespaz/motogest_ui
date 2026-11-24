import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  CarteiraPlacasResponse,
  ConsultaPlacaResponse,
  LancamentoCarteiraResponse,
  PageParams,
  PageResponse,
  RecargaPlacasResponse,
} from '../types';

export const placasApi = {
  consultar: (placa: string) =>
    apiClient
      .get<ConsultaPlacaResponse>(`${API_ROUTES.veiculos.consultaPlaca}/${encodeURIComponent(placa)}`)
      .then((r) => r.data),
  consultarChassi: (placa: string) =>
    apiClient
      .post<ConsultaPlacaResponse>(`${API_ROUTES.veiculos.consultaPlaca}/${encodeURIComponent(placa)}/chassi`)
      .then((r) => r.data),
  carteira: () => apiClient.get<CarteiraPlacasResponse>(API_ROUTES.placas.carteira).then((r) => r.data),
  extrato: (params: PageParams) =>
    apiClient
      .get<PageResponse<LancamentoCarteiraResponse>>(API_ROUTES.placas.extrato, { params })
      .then((r) => r.data),
  criarRecarga: (valorCentavos: number) =>
    apiClient.post<RecargaPlacasResponse>(API_ROUTES.placas.recargas, { valorCentavos }).then((r) => r.data),
  buscarRecarga: (id: number) =>
    apiClient.get<RecargaPlacasResponse>(`${API_ROUTES.placas.recargas}/${id}`).then((r) => r.data),
};
