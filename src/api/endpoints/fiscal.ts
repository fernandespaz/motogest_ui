import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type {
  CancelamentoNfseRequest,
  CertificadoFiscalResponse,
  ConfiguracaoFiscalRequest,
  ConfiguracaoFiscalResponse,
  NfseResponse,
  PageParams,
  PageResponse,
  RegimeTributarioResponse,
} from '../types';

export interface XmlNfse {
  blob: Blob;
  filename: string;
}

/** Extrai o nome do arquivo do Content-Disposition; cai no padrão se o header não vier (ou o CORS não o expuser). */
function nomeArquivoXml(contentDisposition: string | undefined, id: number): string {
  return /filename="?([^";]+)"?/.exec(contentDisposition ?? '')?.[1] ?? `nfse-${id}.xml`;
}

export const fiscalApi = {
  regimes: () => apiClient.get<RegimeTributarioResponse[]>(API_ROUTES.fiscal.regimes).then((r) => r.data),

  configuracao: {
    consultar: () =>
      apiClient.get<ConfiguracaoFiscalResponse>(API_ROUTES.fiscal.configuracao).then((r) => r.data),
    atualizar: (payload: ConfiguracaoFiscalRequest) =>
      apiClient.put<ConfiguracaoFiscalResponse>(API_ROUTES.fiscal.configuracao, payload).then((r) => r.data),
  },

  certificado: {
    consultar: () =>
      apiClient.get<CertificadoFiscalResponse>(API_ROUTES.fiscal.certificado).then((r) => r.data),
    // A senha vai como campo do multipart (o backend lê @RequestParam do corpo) —
    // nunca na URL, onde cairia em log de acesso/histórico. O OpenAPI gerado
    // marca `senha` como query só porque o springdoc não distingue os dois.
    enviar: (arquivo: File, senha: string) => {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('senha', senha);
      // Content-Type fica pro navegador (com o boundary) — o default
      // 'application/json' do apiClient quebraria o upload em silêncio.
      return apiClient
        .put<CertificadoFiscalResponse>(API_ROUTES.fiscal.certificado, formData, {
          headers: { 'Content-Type': undefined },
        })
        .then((r) => r.data);
    },
    remover: () => apiClient.delete<void>(API_ROUTES.fiscal.certificado).then(() => undefined),
  },

  nfse: {
    listar: (params?: PageParams & { ordemServicoId?: number }) =>
      apiClient
        .get<PageResponse<NfseResponse>>(API_ROUTES.fiscal.nfse.base, { params })
        .then((r) => r.data),
    buscar: (id: number) => apiClient.get<NfseResponse>(API_ROUTES.fiscal.nfse.porId(id)).then((r) => r.data),
    // Vai até o governo — pode levar vários segundos; 40 s cobre o pior caso
    // documentado sem deixar a tela pendurada pra sempre.
    emitir: (ordemServicoId: number) =>
      apiClient
        .post<NfseResponse>(API_ROUTES.fiscal.nfse.emitir(ordemServicoId), undefined, { timeout: 40_000 })
        .then((r) => r.data),
    atualizar: (id: number) =>
      apiClient
        .post<NfseResponse>(API_ROUTES.fiscal.nfse.atualizar(id), undefined, { timeout: 40_000 })
        .then((r) => r.data),
    cancelar: (id: number, payload: CancelamentoNfseRequest) =>
      apiClient
        .post<NfseResponse>(API_ROUTES.fiscal.nfse.cancelar(id), payload, { timeout: 40_000 })
        .then((r) => r.data),
    // Rota autenticada por Bearer: um <a href> não manda o header, então o XML
    // chega via apiClient como blob e o chamador o salva (ver saveBlobAsFile).
    baixarXml: (id: number): Promise<XmlNfse> =>
      apiClient
        .get<Blob>(API_ROUTES.fiscal.nfse.xml(id), { responseType: 'blob' })
        .then((r) => ({
          blob: r.data,
          filename: nomeArquivoXml(r.headers?.['content-disposition'] as string | undefined, id),
        })),
  },
};
