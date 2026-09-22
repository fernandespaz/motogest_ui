import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { produtividadeApi } from '@/api/endpoints/produtividade';

export const produtividadeKeys = {
  all: ['produtividade'] as const,
  consultores: (mes: string) => ['produtividade', 'consultores', mes] as const,
  consultor: (usuarioId: number, mes: string) => ['produtividade', 'consultores', mes, usuarioId] as const,
};

// Sem gate de permissão aqui: as duas telas que usam isso ficam atrás de
// <RequirePermission codigo="PRODUTIVIDADE_READ"> na rota, então nem montam
// pra quem não pode ver.

// keepPreviousData: ao trocar de mês a tela continua mostrando os números
// anteriores (esmaecidos) em vez de piscar um spinner de página inteira.
export function useProdutividadeConsultores(mes: string) {
  return useQuery({
    queryKey: produtividadeKeys.consultores(mes),
    queryFn: () => produtividadeApi.consultores(mes),
    placeholderData: keepPreviousData,
  });
}

export function useProdutividadeConsultor(usuarioId: number | undefined, mes: string) {
  return useQuery({
    queryKey: produtividadeKeys.consultor(usuarioId!, mes),
    queryFn: () => produtividadeApi.consultor(usuarioId!, mes),
    enabled: !!usuarioId,
    // Só reaproveita o mês anterior do MESMO consultor — nunca exibe os
    // números de outra pessoa enquanto o detalhe novo carrega.
    placeholderData: (anterior, queryAnterior) =>
      queryAnterior?.queryKey[3] === usuarioId ? anterior : undefined,
  });
}
