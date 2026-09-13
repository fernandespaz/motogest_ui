import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordensServicoApi } from '@/api/endpoints/ordensServico';
import type { OrdemServicoRequest, OrdemServicoResponse, OrdemServicoStatus, PageParams } from '@/api/types';
import { createCrudHooks } from './factory';
import { orcamentosKeys } from './useOrcamentos';

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ordensServicoKeys.all });
      // O orçamento de origem muda de status (vira CONVERTIDO) nessa mesma
      // chamada — sem isso, a lista de orçamentos ficava mostrando "Aprovado"
      // (com o botão de converter) mesmo depois de já virar OS.
      qc.invalidateQueries({ queryKey: orcamentosKeys.all });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

export function useAtualizarStatusOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrdemServicoStatus }) =>
      ordensServicoApi.atualizarStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
