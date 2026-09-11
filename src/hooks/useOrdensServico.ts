import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordensServicoApi } from '@/api/endpoints/ordensServico';
import type { OrdemServicoRequest, OrdemServicoResponse, OrdemServicoStatus, PageParams } from '@/api/types';
import { createCrudHooks } from './factory';

type ListParams = PageParams & { status?: OrdemServicoStatus };

const hooks = createCrudHooks<OrdemServicoResponse, OrdemServicoRequest, ListParams>(
  'ordens-servico',
  ordensServicoApi,
);

export const ordensServicoKeys = hooks.keys;
export const useOrdensServico = hooks.useList;
export const useOrdemServico = hooks.useDetail;
export const useCreateOrdemServico = hooks.useCreate;
export const useUpdateOrdemServico = hooks.useUpdate;

export function useCriarOSAPartirDeOrcamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orcamentoId, usuarioResponsavelId }: { orcamentoId: number; usuarioResponsavelId?: number }) =>
      ordensServicoApi.criarAPartirDeOrcamento(orcamentoId, usuarioResponsavelId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
  });
}

export function useAtualizarStatusOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrdemServicoStatus }) =>
      ordensServicoApi.atualizarStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
  });
}
