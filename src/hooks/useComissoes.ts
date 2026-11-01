import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comissoesApi } from '@/api/endpoints/comissoes';
import type { ComissoesFiltro, ConfiguracaoComissao, PagarComissoesRequest } from '@/api/types';
import { useAuthStore } from '@/store/authStore';
import { contasPagarKeys } from './useFinanceiro';

export const comissoesKeys = {
  all: ['comissoes'] as const,
  configuracao: ['comissoes', 'configuracao'] as const,
  resumo: (params?: Pick<ComissoesFiltro, 'inicio' | 'fim'>) => ['comissoes', 'resumo', params] as const,
  lista: (params?: ComissoesFiltro) => ['comissoes', 'lista', params] as const,
};

// Espelha o @PreAuthorize de GET /comissoes/configuracao.
const PERMISSOES_CONFIGURACAO = ['HORA_TECNICA_GERENCIAR', 'FINANCEIRO_READ'];

export function useConfiguracaoComissao() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return useQuery({
    queryKey: comissoesKeys.configuracao,
    queryFn: () => comissoesApi.configuracao(),
    enabled: PERMISSOES_CONFIGURACAO.some(hasPermission),
  });
}

export function useSalvarConfiguracaoComissao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConfiguracaoComissao) => comissoesApi.salvarConfiguracao(payload),
    // a auditoria da hora técnica também registra a mudança (CONFIGURACAO_COMISSAO)
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: comissoesKeys.configuracao });
      qc.invalidateQueries({ queryKey: ['hora-tecnica', 'auditoria'] });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

export function useResumoComissoes(params: Pick<ComissoesFiltro, 'inicio' | 'fim'>, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: comissoesKeys.resumo(params),
    queryFn: () => comissoesApi.resumo(params),
    enabled: options?.enabled,
  });
}

export function useComissoes(params: ComissoesFiltro, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: comissoesKeys.lista(params),
    queryFn: () => comissoesApi.listar(params),
    enabled: options?.enabled,
  });
}

export function usePagarComissoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PagarComissoesRequest) => comissoesApi.pagar(payload),
    // o pagamento cria uma conta a pagar já baixada (categoria "Comissões")
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: comissoesKeys.all });
      qc.invalidateQueries({ queryKey: contasPagarKeys.all });
    },
    meta: { hasLocalErrorHandling: true },
  });
}
