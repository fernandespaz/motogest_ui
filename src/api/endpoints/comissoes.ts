import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  ComissaoResponse,
  ComissoesFiltro,
  ConfiguracaoComissao,
  PagamentoComissoesResponse,
  PagarComissoesRequest,
  ResumoComissaoFuncionario,
} from '../types';

export const comissoesApi = {
  configuracao: () => apiClient.get<ConfiguracaoComissao>(API_ROUTES.comissoes.configuracao).then((r) => r.data),
  salvarConfiguracao: (payload: ConfiguracaoComissao) =>
    apiClient.put<ConfiguracaoComissao>(API_ROUTES.comissoes.configuracao, payload).then((r) => r.data),
  resumo: (params?: Pick<ComissoesFiltro, 'inicio' | 'fim'>) =>
    apiClient.get<ResumoComissaoFuncionario[]>(API_ROUTES.comissoes.resumo, { params }).then((r) => r.data),
  listar: (params?: ComissoesFiltro) =>
    apiClient.get<ComissaoResponse[]>(API_ROUTES.comissoes.base, { params }).then((r) => r.data),
  pagar: (payload: PagarComissoesRequest) =>
    apiClient.post<PagamentoComissoesResponse>(API_ROUTES.comissoes.pagamento, payload).then((r) => r.data),
};
