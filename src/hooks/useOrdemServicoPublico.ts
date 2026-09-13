import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordemServicoPublicoApi } from '@/api/endpoints/ordemServicoPublico';

export const ordemServicoPublicoKeys = {
  detail: (token: string) => ['ordem-servico-publico', token] as const,
};

export function useOrdemServicoPublico(token: string | undefined) {
  return useQuery({
    queryKey: ordemServicoPublicoKeys.detail(token ?? ''),
    queryFn: () => ordemServicoPublicoApi.buscar(token!),
    enabled: !!token,
    retry: false,
    meta: { silentError: true },
  });
}

export function useAprovarOrdemServicoPublico(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ordemServicoPublicoApi.aprovar(token),
    onSuccess: (data) => qc.setQueryData(ordemServicoPublicoKeys.detail(token), data),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useRejeitarOrdemServicoPublico(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ordemServicoPublicoApi.rejeitar(token),
    onSuccess: (data) => qc.setQueryData(ordemServicoPublicoKeys.detail(token), data),
    meta: { hasLocalErrorHandling: true },
  });
}
