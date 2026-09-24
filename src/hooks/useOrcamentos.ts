import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const TAMANHO_PAGINA_BUSCA = 200;

/**
 * GET /orcamentos não tem NENHUM filtro no backend — nem status, nem
 * consultor (confirmado no openapi.json: o único parâmetro é `pageable`).
 * OrcamentosPage precisa filtrar no cliente (esconder orçamento convertido,
 * restringir cada consultor à própria carteira — ver comentário lá). Filtrar
 * DEPOIS de uma página já paginada pelo servidor quebra a paginação: uma
 * página de 20 pode sobrar só 2 itens após o filtro, a seguinte 5, e por aí
 * vai — foi exatamente esse o bug reportado. A correção é buscar todas as
 * páginas uma vez (o backend não expõe volume suficiente de orçamentos por
 * oficina pra isso pesar) e paginar/filtrar por cima do conjunto completo,
 * no cliente.
 */
export function useTodosOrcamentos(sort?: string) {
  return useQuery({
    queryKey: [...orcamentosKeys.all, 'todos', sort],
    queryFn: async () => {
      const primeira = await orcamentosApi.list({ page: 0, size: TAMANHO_PAGINA_BUSCA, sort });
      const conteudo = [...(primeira.content ?? [])];
      for (let pagina = 1; pagina < (primeira.totalPages ?? 1); pagina++) {
        const proxima = await orcamentosApi.list({ page: pagina, size: TAMANHO_PAGINA_BUSCA, sort });
        conteudo.push(...(proxima.content ?? []));
      }
      return conteudo;
    },
  });
}

function useTransition(fn: (id: number) => Promise<OrcamentoResponse>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: orcamentosKeys.all }),
    meta: { hasLocalErrorHandling: true },
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
