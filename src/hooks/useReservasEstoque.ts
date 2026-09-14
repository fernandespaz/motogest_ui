import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reservasEstoqueApi, type ReservasEstoqueListParams } from '@/api/endpoints/reservasEstoque';
import { produtosKeys } from './useProdutos';
import { useAuthStore } from '@/store/authStore';
import type { ReservarEstoqueRequest } from '@/api/types';

export const reservasEstoqueKeys = {
  all: ['reservas-estoque'] as const,
  list: (params?: ReservasEstoqueListParams) => ['reservas-estoque', 'list', params] as const,
};

export function useReservasEstoque(params?: ReservasEstoqueListParams) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return useQuery({
    queryKey: reservasEstoqueKeys.list(params),
    queryFn: () => reservasEstoqueApi.list(params),
    enabled: hasPermission('ESTOQUE_RESERVAR'),
  });
}

export function useReservarEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ produtoId, payload }: { produtoId: number; payload: ReservarEstoqueRequest }) =>
      reservasEstoqueApi.reservar(produtoId, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: reservasEstoqueKeys.all });
      qc.invalidateQueries({ queryKey: produtosKeys.all });
      qc.invalidateQueries({ queryKey: produtosKeys.detail(variables.produtoId) });
    },
    meta: { hasLocalErrorHandling: true },
  });
}

export function useLiberarReservaEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reservasEstoqueApi.liberar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservasEstoqueKeys.all });
      qc.invalidateQueries({ queryKey: produtosKeys.all });
    },
    meta: { hasLocalErrorHandling: true },
  });
}
