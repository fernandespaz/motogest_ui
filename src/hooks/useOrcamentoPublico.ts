import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orcamentoPublicoApi } from '@/api/endpoints/orcamentoPublico';

export const orcamentoPublicoKeys = {
  detail: (token: string) => ['orcamento-publico', token] as const,
};

export function useOrcamentoPublico(token: string | undefined) {
  return useQuery({
    queryKey: orcamentoPublicoKeys.detail(token ?? ''),
    queryFn: () => orcamentoPublicoApi.buscar(token!),
    enabled: !!token,
    retry: false,
    meta: { silentError: true },
  });
}

export function useAprovarOrcamentoPublico(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => orcamentoPublicoApi.aprovar(token),
    onSuccess: (data) => qc.setQueryData(orcamentoPublicoKeys.detail(token), data),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useRejeitarOrcamentoPublico(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => orcamentoPublicoApi.rejeitar(token),
    onSuccess: (data) => qc.setQueryData(orcamentoPublicoKeys.detail(token), data),
    meta: { hasLocalErrorHandling: true },
  });
}
