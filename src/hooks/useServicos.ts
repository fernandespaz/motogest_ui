import { useQuery } from '@tanstack/react-query';
import { servicosApi } from '@/api/endpoints/servicos';
import type { ServicoRequest, ServicoResponse } from '@/api/types';
import { createCrudHooks } from './factory';

const hooks = createCrudHooks<ServicoResponse, ServicoRequest>('servicos', servicosApi);

export const servicosKeys = hooks.keys;
export const useServicos = hooks.useList;
export const useServico = hooks.useDetail;
export const useCreateServico = hooks.useCreate;
export const useUpdateServico = hooks.useUpdate;
export const useDeleteServico = hooks.useRemove;

const TAMANHO_PAGINA_BUSCA = 200;

/**
 * GET /servicos não tem NENHUM filtro de busca no backend — só `pageable`
 * (confirmado no openapi.json, mesmo caso de useTodosOrcamentos em
 * useOrcamentos.ts). Filtrar por nome DEPOIS de uma página já paginada pelo
 * servidor quebra a contagem por página (o bug já corrigido lá) — a mesma
 * correção se aplica aqui: busca todas as páginas uma vez (o catálogo de
 * serviços de uma oficina não é grande o bastante pra isso pesar) e
 * filtra/pagina por cima do conjunto completo, no cliente.
 */
export function useTodosServicos() {
  return useQuery({
    queryKey: [...servicosKeys.all, 'todos'],
    queryFn: async () => {
      const primeira = await servicosApi.list({ page: 0, size: TAMANHO_PAGINA_BUSCA });
      const conteudo = [...(primeira.content ?? [])];
      for (let pagina = 1; pagina < (primeira.totalPages ?? 1); pagina++) {
        const proxima = await servicosApi.list({ page: pagina, size: TAMANHO_PAGINA_BUSCA });
        conteudo.push(...(proxima.content ?? []));
      }
      return conteudo;
    },
  });
}
