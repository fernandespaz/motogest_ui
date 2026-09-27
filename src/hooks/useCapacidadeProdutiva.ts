import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { capacidadeProdutivaApi } from '@/api/endpoints/capacidadeProdutiva';
import type { CapacidadeProdutivaRequest, PageParams } from '@/api/types';

export const PERMISSAO_GERENCIAR_CAPACIDADE_PRODUTIVA = 'CAPACIDADE_PRODUTIVA_GERENCIAR';

export const capacidadeProdutivaKeys = {
  all: ['capacidade-produtiva'] as const,
  atual: ['capacidade-produtiva', 'atual'] as const,
  auditoria: (params?: PageParams) => ['capacidade-produtiva', 'auditoria', params] as const,
};

export function useCapacidadeProdutiva() {
  return useQuery({
    queryKey: capacidadeProdutivaKeys.atual,
    queryFn: () => capacidadeProdutivaApi.consultar(),
  });
}

export function useAuditoriaCapacidadeProdutiva(params?: PageParams) {
  return useQuery({
    queryKey: capacidadeProdutivaKeys.auditoria(params),
    queryFn: () => capacidadeProdutivaApi.auditoria(params),
  });
}

export function useAtualizarCapacidadeProdutiva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CapacidadeProdutivaRequest) => capacidadeProdutivaApi.atualizar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: capacidadeProdutivaKeys.all }),
    meta: { hasLocalErrorHandling: true },
  });
}
