import { useQuery } from '@tanstack/react-query';
import { produtosApi } from '@/api/endpoints/produtos';
import type { ProdutoRequest, ProdutoResponse } from '@/api/types';
import { createCrudHooks } from './factory';

const hooks = createCrudHooks<ProdutoResponse, ProdutoRequest>('produtos', produtosApi);

export const produtosKeys = hooks.keys;
export const useProdutos = hooks.useList;
export const useProduto = hooks.useDetail;
export const useCreateProduto = hooks.useCreate;
export const useUpdateProduto = hooks.useUpdate;
export const useDeleteProduto = hooks.useRemove;

export function useProdutosAbaixoDoMinimo() {
  return useQuery({
    queryKey: [...produtosKeys.all, 'abaixo-do-minimo'],
    queryFn: () => produtosApi.abaixoDoMinimo(),
  });
}
