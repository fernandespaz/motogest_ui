import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { produtosApi, type ProdutosAbaixoDoMinimoParams, type ProdutosListParams } from '@/api/endpoints/produtos';
import type { ProdutoRequest, ProdutoResponse } from '@/api/types';
import { createCrudHooks } from './factory';

const hooks = createCrudHooks<ProdutoResponse, ProdutoRequest, ProdutosListParams>('produtos', produtosApi);

export const produtosKeys = hooks.keys;
export const useProdutos = hooks.useList;
export const useProduto = hooks.useDetail;
export const useCreateProduto = hooks.useCreate;
export const useUpdateProduto = hooks.useUpdate;
export const useDeleteProduto = hooks.useRemove;

export function useProdutosAbaixoDoMinimo(params?: ProdutosAbaixoDoMinimoParams) {
  return useQuery({
    queryKey: [...produtosKeys.all, 'abaixo-do-minimo', params],
    queryFn: () => produtosApi.abaixoDoMinimo(params),
  });
}

/**
 * Foto do produto como Blob (a rota exige JWT, então não dá pra usar num <img
 * src> direto). Só busca quando o produto tem `imagemUrl` — sem ela não há
 * foto e o cartão cai pro ícone da categoria. `imagemUrl` entra na chave pra
 * que uma URL nova (foto trocada) nunca reaproveite o blob antigo; as
 * mutações abaixo invalidam `produtosKeys.all`, que cobre esta chave também.
 */
export function useProdutoImagemBlob(id?: number, imagemUrl?: string | null) {
  return useQuery({
    queryKey: [...produtosKeys.all, 'imagem', id, imagemUrl],
    queryFn: () => produtosApi.buscarImagemBlob(id!),
    enabled: id != null && !!imagemUrl,
    staleTime: Infinity,
    meta: { silentError: true },
  });
}

export function useEnviarImagemProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, arquivo }: { id: number; arquivo: File }) => produtosApi.enviarImagem(id, arquivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: produtosKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}

export function useRemoverImagemProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => produtosApi.removerImagem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: produtosKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
