import { apiClient } from '../client';
import { createCrudApi } from '../crud';
import { API_ROUTES } from '../routes';
import type { ModeloVeiculoRequest, ModeloVeiculoResponse, PageParams } from '../types';

export type ModelosVeiculoListParams = PageParams & { marca?: string };

const base = createCrudApi<ModeloVeiculoResponse, ModeloVeiculoRequest, ModelosVeiculoListParams>(
  API_ROUTES.modelosVeiculo.base,
);

function paraFormData(arquivo?: File) {
  const formData = new FormData();
  if (arquivo) formData.append('arquivo', arquivo);
  return formData;
}

export const modelosVeiculoApi = {
  // list/get/remove do createCrudApi já batem com o contrato (marca é query
  // param no GET, igual a qualquer outro filtro de listagem).
  ...base,
  // marca/modelo vão por query string (não no corpo) e o arquivo é opcional
  // via multipart — diferente do create/update genérico do createCrudApi,
  // que manda o payload inteiro como JSON.
  create: (payload: ModeloVeiculoRequest) =>
    apiClient
      .post<ModeloVeiculoResponse>(API_ROUTES.modelosVeiculo.base, paraFormData(payload.arquivo), {
        params: { marca: payload.marca, modelo: payload.modelo },
        // Content-Type precisa ficar por conta do browser (define o boundary do
        // multipart) — o 'application/json' padrão do apiClient quebraria o envio.
        headers: { 'Content-Type': undefined },
      })
      .then((r) => r.data),
  update: (id: number, payload: ModeloVeiculoRequest) =>
    apiClient
      .put<ModeloVeiculoResponse>(`${API_ROUTES.modelosVeiculo.base}/${id}`, paraFormData(payload.arquivo), {
        params: { marca: payload.marca, modelo: payload.modelo },
        headers: { 'Content-Type': undefined },
      })
      .then((r) => r.data),
};
