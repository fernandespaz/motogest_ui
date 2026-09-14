import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { descontosApi, type DescontosListParams } from '@/api/endpoints/descontos';
import { useAuthStore } from '@/store/authStore';
import { orcamentosKeys } from './useOrcamentos';
import { ordensServicoKeys } from './useOrdensServico';
import type { OrigemDesconto, RejeitarSolicitacaoDescontoRequest, SolicitacaoDescontoRequest } from '@/api/types';

export const descontosKeys = {
  all: ['descontos'] as const,
  list: (params?: DescontosListParams) => ['descontos', 'list', params] as const,
};

// Origem cujo agregado (valorTotal do Orçamento/OS) deve ser reconsultado
// depois que uma solicitação de desconto é decidida — o backend recalcula o
// valorTotal na aprovação, então a tela de origem precisa refazer o fetch.
function invalidarOrigem(qc: ReturnType<typeof useQueryClient>, origemTipo: OrigemDesconto, origemId: number) {
  qc.invalidateQueries({ queryKey: descontosKeys.all });
  if (origemTipo === 'ORCAMENTO') {
    qc.invalidateQueries({ queryKey: orcamentosKeys.all });
    qc.invalidateQueries({ queryKey: orcamentosKeys.detail(origemId) });
  } else {
    qc.invalidateQueries({ queryKey: ordensServicoKeys.all });
    qc.invalidateQueries({ queryKey: ordensServicoKeys.detail(origemId) });
  }
}

/** Lista solicitações de um Orçamento/OS específico — usada pra mostrar o status por item na tela de origem. */
export function useDescontosPorOrigem(origemTipo: OrigemDesconto | undefined, origemId: number | undefined) {
  return useQuery({
    queryKey: descontosKeys.list({ origemTipo, origemId }),
    queryFn: () => descontosApi.list({ origemTipo, origemId, size: 100 }),
    enabled: !!origemTipo && !!origemId,
  });
}

/** Lista solicitações pendentes de toda a oficina — usada na tela de aprovação (DESCONTO_APROVAR). */
export function useSolicitacoesDescontoPendentes(params?: Omit<DescontosListParams, 'status'>) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return useQuery({
    queryKey: descontosKeys.list({ ...params, status: 'PENDENTE' }),
    queryFn: () => descontosApi.list({ ...params, status: 'PENDENTE', size: 100 }),
    enabled: hasPermission('DESCONTO_APROVAR'),
  });
}

export function useSolicitarDesconto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SolicitacaoDescontoRequest) => descontosApi.solicitar(payload),
    onSuccess: (data) => invalidarOrigem(qc, data.origemTipo!, data.origemId!),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useAprovarDesconto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => descontosApi.aprovar(id),
    onSuccess: (data) => invalidarOrigem(qc, data.origemTipo!, data.origemId!),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useRejeitarDesconto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RejeitarSolicitacaoDescontoRequest }) =>
      descontosApi.rejeitar(id, payload),
    onSuccess: (data) => invalidarOrigem(qc, data.origemTipo!, data.origemId!),
    meta: { hasLocalErrorHandling: true },
  });
}
