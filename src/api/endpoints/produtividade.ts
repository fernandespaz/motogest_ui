import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  ProdutividadeConsultorDetalheResponse,
  ProdutividadeConsultoresResponse,
  ProdutividadeMecanicoDetalheResponse,
  ProdutividadeOficinaResponse,
} from '../types';

/** `mes` no formato "yyyy-MM"; omitido, o backend usa o mês corrente. */
export const produtividadeApi = {
  consultores: (mes?: string) =>
    apiClient
      .get<ProdutividadeConsultoresResponse>(API_ROUTES.produtividade.consultores, { params: { mes } })
      .then((r) => r.data),
  consultor: (usuarioId: number, mes?: string) =>
    apiClient
      .get<ProdutividadeConsultorDetalheResponse>(API_ROUTES.produtividade.consultor(usuarioId), { params: { mes } })
      .then((r) => r.data),
  mecanicos: (mes?: string) =>
    apiClient
      .get<ProdutividadeOficinaResponse>(API_ROUTES.produtividade.mecanicos, { params: { mes } })
      .then((r) => r.data),
  mecanico: (usuarioId: number, mes?: string) =>
    apiClient
      .get<ProdutividadeMecanicoDetalheResponse>(API_ROUTES.produtividade.mecanico(usuarioId), { params: { mes } })
      .then((r) => r.data),
  // Autoescopado pelo token — não exige PRODUTIVIDADE_READ (ver MinhaProdutividadePage).
  mecanicoMe: (mes?: string) =>
    apiClient
      .get<ProdutividadeMecanicoDetalheResponse>(API_ROUTES.produtividade.mecanicoMe, { params: { mes } })
      .then((r) => r.data),
};
