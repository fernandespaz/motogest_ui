import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fiscalApi } from '@/api/endpoints/fiscal';
import type { CancelamentoNfseRequest, ConfiguracaoFiscalRequest, PageParams } from '@/api/types';
import { useAuthStore } from '@/store/authStore';

export const PERMISSAO_FISCAL_CONFIGURAR = 'FISCAL_CONFIGURAR';
export const PERMISSAO_FISCAL_CERTIFICADO = 'FISCAL_CERTIFICADO';
export const PERMISSAO_FISCAL_EMITIR = 'FISCAL_EMITIR';
export const PERMISSAO_FISCAL_CANCELAR = 'FISCAL_CANCELAR';

/** Qualquer uma libera o menu/página fiscal. */
export const PERMISSOES_FISCAL = [
  PERMISSAO_FISCAL_CONFIGURAR,
  PERMISSAO_FISCAL_CERTIFICADO,
  PERMISSAO_FISCAL_EMITIR,
  PERMISSAO_FISCAL_CANCELAR,
];

// Espelham os @PreAuthorize do backend (NfseController, ConfiguracaoFiscalController,
// CertificadoFiscalController). Fora dessas listas a consulta nem sai — evita o
// 403 com toast global (ver prohibited-actions #2).
const PERMISSOES_LER_CONFIGURACAO = [PERMISSAO_FISCAL_CONFIGURAR, PERMISSAO_FISCAL_EMITIR];
const PERMISSOES_LER_CERTIFICADO = [PERMISSAO_FISCAL_CERTIFICADO, PERMISSAO_FISCAL_CONFIGURAR, PERMISSAO_FISCAL_EMITIR];

export const fiscalKeys = {
  all: ['fiscal'] as const,
  regimes: ['fiscal', 'regimes'] as const,
  configuracao: ['fiscal', 'configuracao'] as const,
  certificado: ['fiscal', 'certificado'] as const,
  notas: ['fiscal', 'nfse'] as const,
  lista: (params?: PageParams & { ordemServicoId?: number }) => ['fiscal', 'nfse', 'lista', params] as const,
  nota: (id: number | undefined) => ['fiscal', 'nfse', 'detalhe', id] as const,
};

// As telas fiscais exibem a falha num diálogo próprio (todo alerta do módulo é
// um diálogo central), então o toast global de erro de query fica de fora.
const SILENT = { silentError: true } as const;

function useAlgumaPermissao(codigos: string[]) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return codigos.some(hasPermission);
}

export function useRegimesTributarios() {
  const enabled = useAlgumaPermissao(PERMISSOES_LER_CONFIGURACAO);
  return useQuery({
    queryKey: fiscalKeys.regimes,
    queryFn: () => fiscalApi.regimes(),
    enabled,
    staleTime: 60 * 60 * 1000,
    meta: SILENT,
  });
}

export function useConfiguracaoFiscal() {
  const enabled = useAlgumaPermissao(PERMISSOES_LER_CONFIGURACAO);
  return useQuery({
    queryKey: fiscalKeys.configuracao,
    queryFn: () => fiscalApi.configuracao.consultar(),
    enabled,
    meta: SILENT,
  });
}

export function useCertificadoFiscal() {
  const enabled = useAlgumaPermissao(PERMISSOES_LER_CERTIFICADO);
  return useQuery({
    queryKey: fiscalKeys.certificado,
    queryFn: () => fiscalApi.certificado.consultar(),
    enabled,
    meta: SILENT,
  });
}

// Configuração e certificado compõem as `pendencias` um do outro (o backend
// recalcula a lista a cada leitura), então mexer em um invalida os dois.
function useInvalidarConfiguracaoECertificado() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: fiscalKeys.configuracao }),
      qc.invalidateQueries({ queryKey: fiscalKeys.certificado }),
    ]);
}

export function useAtualizarConfiguracaoFiscal() {
  const invalidar = useInvalidarConfiguracaoECertificado();
  return useMutation({
    mutationFn: (payload: ConfiguracaoFiscalRequest) => fiscalApi.configuracao.atualizar(payload),
    onSuccess: invalidar,
    meta: { hasLocalErrorHandling: true },
  });
}

export function useEnviarCertificadoFiscal() {
  const invalidar = useInvalidarConfiguracaoECertificado();
  return useMutation({
    mutationFn: ({ arquivo, senha }: { arquivo: File; senha: string }) =>
      fiscalApi.certificado.enviar(arquivo, senha),
    onSuccess: invalidar,
    meta: { hasLocalErrorHandling: true },
  });
}

export function useRemoverCertificadoFiscal() {
  const invalidar = useInvalidarConfiguracaoECertificado();
  return useMutation({
    mutationFn: () => fiscalApi.certificado.remover(),
    onSuccess: invalidar,
    meta: { hasLocalErrorHandling: true },
  });
}

/** Lista paginada de notas (mais recentes primeiro); `ordemServicoId` filtra pelas notas de uma OS. */
export function useNotasFiscais(
  params?: PageParams & { ordemServicoId?: number },
  options?: { enabled?: boolean },
) {
  const permitido = useAlgumaPermissao([PERMISSAO_FISCAL_EMITIR]);
  return useQuery({
    queryKey: fiscalKeys.lista(params),
    queryFn: () => fiscalApi.nfse.listar(params),
    enabled: permitido && (options?.enabled ?? true),
    meta: SILENT,
  });
}

/** Nota com a trilha de eventos (a listagem não os traz). */
export function useNotaFiscal(id: number | undefined) {
  const permitido = useAlgumaPermissao([PERMISSAO_FISCAL_EMITIR]);
  return useQuery({
    queryKey: fiscalKeys.nota(id),
    queryFn: () => fiscalApi.nfse.buscar(id as number),
    enabled: permitido && id != null,
    meta: SILENT,
  });
}

// Emitir/atualizar/cancelar mudam o status de uma nota: listas e detalhes
// ficam velhos juntos, então todo o ramo `nfse` é invalidado.
function useInvalidarNotas() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: fiscalKeys.notas });
}

export function useEmitirNfse() {
  const invalidar = useInvalidarNotas();
  return useMutation({
    mutationFn: (ordemServicoId: number) => fiscalApi.nfse.emitir(ordemServicoId),
    onSuccess: invalidar,
    meta: { hasLocalErrorHandling: true },
  });
}

export function useAtualizarNfse() {
  const invalidar = useInvalidarNotas();
  return useMutation({
    mutationFn: (id: number) => fiscalApi.nfse.atualizar(id),
    onSuccess: invalidar,
    meta: { hasLocalErrorHandling: true },
  });
}

export function useCancelarNfse() {
  const invalidar = useInvalidarNotas();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CancelamentoNfseRequest }) =>
      fiscalApi.nfse.cancelar(id, payload),
    onSuccess: invalidar,
    meta: { hasLocalErrorHandling: true },
  });
}

export function useBaixarXmlNfse() {
  return useMutation({
    mutationFn: (id: number) => fiscalApi.nfse.baixarXml(id),
    meta: { hasLocalErrorHandling: true },
  });
}
