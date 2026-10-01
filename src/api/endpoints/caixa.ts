import axios from 'axios';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  CaixaMovimentoRequest,
  CaixaMovimentoResponse,
  CaixaSessaoAberturaRequest,
  CaixaSessaoEventoResponse,
  CaixaSessaoFechamentoRequest,
  CaixaSessaoReaberturaRequest,
  CaixaSessaoResponse,
  FaturamentoOrdemServicoRequest,
  FaturamentoOrdemServicoResponse,
  FormatoExportacaoCaixa,
  PageParams,
  PageResponse,
  RelatorioCaixaDiarioResponse,
  RelatorioCaixaPeriodoResponse,
} from '../types';

export const caixaApi = {
  list: (params?: PageParams) =>
    apiClient.get<PageResponse<CaixaMovimentoResponse>>(API_ROUTES.caixa.movimentos, { params }).then((r) => r.data),
  periodo: (inicio: string, fim: string) =>
    apiClient
      .get<CaixaMovimentoResponse[]>(API_ROUTES.caixa.periodo, { params: { inicio, fim } })
      .then((r) => r.data),
  saldo: (inicio: string, fim: string) =>
    apiClient
      .get<{ saldo: number }>(API_ROUTES.caixa.saldo, { params: { inicio, fim } })
      .then((r) => r.data.saldo),
  registrar: (payload: CaixaMovimentoRequest) =>
    apiClient.post<CaixaMovimentoResponse>(API_ROUTES.caixa.movimentos, payload).then((r) => r.data),
  faturar: (ordemServicoId: number, payload: FaturamentoOrdemServicoRequest) =>
    apiClient
      .post<FaturamentoOrdemServicoResponse>(API_ROUTES.caixa.faturamento(ordemServicoId), payload)
      .then((r) => r.data),

  sessoes: {
    listar: (params?: PageParams) =>
      apiClient
        .get<PageResponse<CaixaSessaoResponse>>(API_ROUTES.caixa.sessoes.base, { params })
        .then((r) => r.data),
    abrir: (payload: CaixaSessaoAberturaRequest) =>
      apiClient.post<CaixaSessaoResponse>(API_ROUTES.caixa.sessoes.base, payload).then((r) => r.data),
    // A sessão aberta é estado operacional real (define se o operador pode
    // lançar/faturar), não um dado cosmético — só o 404 documentado (nenhuma
    // sessão aberta) vira `null`; qualquer outro erro continua propagando.
    aberta: async (): Promise<CaixaSessaoResponse | null> => {
      try {
        const { data } = await apiClient.get<CaixaSessaoResponse>(API_ROUTES.caixa.sessoes.aberta);
        return data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    buscarPorId: (id: number) =>
      apiClient.get<CaixaSessaoResponse>(API_ROUTES.caixa.sessoes.detail(id)).then((r) => r.data),
    eventos: (id: number) =>
      apiClient.get<CaixaSessaoEventoResponse[]>(API_ROUTES.caixa.sessoes.eventos(id)).then((r) => r.data),
    fechar: (id: number, payload: CaixaSessaoFechamentoRequest) =>
      apiClient.post<CaixaSessaoResponse>(API_ROUTES.caixa.sessoes.fechar(id), payload).then((r) => r.data),
    reabrir: (id: number, payload: CaixaSessaoReaberturaRequest) =>
      apiClient.post<CaixaSessaoResponse>(API_ROUTES.caixa.sessoes.reabrir(id), payload).then((r) => r.data),
    exportar: (id: number, formato: FormatoExportacaoCaixa) =>
      apiClient
        .get<Blob>(API_ROUTES.caixa.sessoes.exportar(id), { params: { formato }, responseType: 'blob' })
        .then((r) => r.data),
  },

  relatorios: {
    diario: (data: string) =>
      apiClient
        .get<RelatorioCaixaDiarioResponse>(API_ROUTES.caixa.relatorios.diario, { params: { data } })
        .then((r) => r.data),
    diarioExportar: (data: string, formato: FormatoExportacaoCaixa) =>
      apiClient
        .get<Blob>(API_ROUTES.caixa.relatorios.diarioExportar, { params: { data, formato }, responseType: 'blob' })
        .then((r) => r.data),
    periodo: (inicio: string, fim: string) =>
      apiClient
        .get<RelatorioCaixaPeriodoResponse>(API_ROUTES.caixa.relatorios.periodo, { params: { inicio, fim } })
        .then((r) => r.data),
    periodoExportar: (inicio: string, fim: string, formato: FormatoExportacaoCaixa) =>
      apiClient
        .get<Blob>(API_ROUTES.caixa.relatorios.periodoExportar, {
          params: { inicio, fim, formato },
          responseType: 'blob',
        })
        .then((r) => r.data),
  },
};
