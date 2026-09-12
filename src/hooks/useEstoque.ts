import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { estoqueApi } from '@/api/endpoints/estoque';
import { produtosKeys } from './useProdutos';
import type { MovimentacaoEstoqueRequest, PageParams } from '@/api/types';

export const estoqueKeys = {
  all: ['movimentacoes-estoque'] as const,
  list: (params?: PageParams) => ['movimentacoes-estoque', 'list', params] as const,
  porProduto: (produtoId: number, params?: PageParams) =>
    ['movimentacoes-estoque', 'produto', produtoId, params] as const,
};

export function useMovimentacoesEstoque(params?: PageParams) {
  return useQuery({ queryKey: estoqueKeys.list(params), queryFn: () => estoqueApi.list(params) });
}

export function useMovimentacoesPorProduto(produtoId: number | undefined, params?: PageParams) {
  return useQuery({
    queryKey: estoqueKeys.porProduto(produtoId!, params),
    queryFn: () => estoqueApi.listPorProduto(produtoId!, params),
    enabled: !!produtoId,
  });
}

export function useRegistrarMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ produtoId, payload }: { produtoId: number; payload: MovimentacaoEstoqueRequest }) =>
      estoqueApi.registrar(produtoId, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: estoqueKeys.all });
      qc.invalidateQueries({ queryKey: produtosKeys.all });
      qc.invalidateQueries({ queryKey: produtosKeys.detail(variables.produtoId) });
    },
    meta: { hasLocalErrorHandling: true },
  });
}
