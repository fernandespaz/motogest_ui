import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordensServicoApi, type OrdensServicoListParams } from '@/api/endpoints/ordensServico';
import type { OrdemServicoRequest, OrdemServicoResponse, OrdemServicoStatus } from '@/api/types';
import { createCrudHooks } from './factory';
import { orcamentosKeys } from './useOrcamentos';

const hooks = createCrudHooks<OrdemServicoResponse, OrdemServicoRequest, OrdensServicoListParams>(
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

export function useEnviarOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordensServicoApi.enviar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useTimerStartOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordensServicoApi.timerStart(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useTimerPauseOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => ordensServicoApi.timerPause(id, motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useTimerResumeOS() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordensServicoApi.timerResume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ordensServicoKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
