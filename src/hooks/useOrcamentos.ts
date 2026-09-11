import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orcamentosApi } from '@/api/endpoints/orcamentos';
import type { OrcamentoRequest, OrcamentoResponse, PageParams } from '@/api/types';
import { createCrudHooks } from './factory';

const hooks = createCrudHooks<OrcamentoResponse, OrcamentoRequest, PageParams>('orcamentos', orcamentosApi);

export const orcamentosKeys = hooks.keys;
export const useOrcamentos = hooks.useList;
export const useOrcamento = hooks.useDetail;
export const useCreateOrcamento = hooks.useCreate;
export const useUpdateOrcamento = hooks.useUpdate;
export const useDeleteOrcamento = hooks.useRemove;

function useTransition(fn: (id: number) => Promise<OrcamentoResponse>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: orcamentosKeys.all }),
  });
}

export function useEnviarOrcamento() {
  return useTransition(orcamentosApi.enviar);
}
export function useAprovarOrcamento() {
  return useTransition(orcamentosApi.aprovar);
}
export function useRejeitarOrcamento() {
  return useTransition(orcamentosApi.rejeitar);
}
