import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { produtividadeApi } from '@/api/endpoints/produtividade';
import { mesReferenciaAtual } from '@/lib/formatters';

export const produtividadeKeys = {
  all: ['produtividade'] as const,
  consultores: (mes: string) => ['produtividade', 'consultores', mes] as const,
  consultor: (usuarioId: number, mes: string) => ['produtividade', 'consultores', mes, usuarioId] as const,
  mecanicos: (mes: string) => ['produtividade', 'mecanicos', mes] as const,
  mecanico: (usuarioId: number, mes: string) => ['produtividade', 'mecanicos', mes, usuarioId] as const,
  mecanicoMe: (mes: string) => ['produtividade', 'mecanicos', mes, 'me'] as const,
};

/**
 * "Tempo real" dos relatórios de mecânico: o backend não tem push, então o
 * mês corrente é reconsultado a cada 30s enquanto a aba está visível (o
 * React Query pausa o intervalo com a aba em segundo plano). Mês passado é
 * fechado — não há o que atualizar, então nada de polling.
 */
export const INTERVALO_TEMPO_REAL_MS = 30_000;

function intervaloSeMesCorrente(mes: string): number | false {
  return mes === mesReferenciaAtual() ? INTERVALO_TEMPO_REAL_MS : false;
}

// Sem gate de permissão aqui: as telas que usam isso ficam atrás de
// <RequirePermission codigo="PRODUTIVIDADE_READ"> na rota (ou recebem
// `enabled` de fora), então nem montam/disparam pra quem não pode ver.

// keepPreviousData: ao trocar de mês a tela continua mostrando os números
// anteriores (esmaecidos) em vez de piscar um spinner de página inteira.
export function useProdutividadeConsultores(mes: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: produtividadeKeys.consultores(mes),
    queryFn: () => produtividadeApi.consultores(mes),
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
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

export function useProdutividadeMecanicos(mes: string) {
  return useQuery({
    queryKey: produtividadeKeys.mecanicos(mes),
    queryFn: () => produtividadeApi.mecanicos(mes),
    placeholderData: keepPreviousData,
    refetchInterval: intervaloSeMesCorrente(mes),
  });
}

export function useProdutividadeMecanico(usuarioId: number | undefined, mes: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: produtividadeKeys.mecanico(usuarioId!, mes),
    queryFn: () => produtividadeApi.mecanico(usuarioId!, mes),
    enabled: !!usuarioId && (options?.enabled ?? true),
    // Mesmo cuidado do detalhe de consultor: nunca mostra outro mecânico.
    placeholderData: (anterior, queryAnterior) =>
      queryAnterior?.queryKey[3] === usuarioId ? anterior : undefined,
    refetchInterval: intervaloSeMesCorrente(mes),
  });
}

/**
 * Produtividade do próprio mecânico logado — GET /produtividade/mecanicos/me,
 * autoescopado pelo token (exige só estar autenticado, não PRODUTIVIDADE_READ).
 * Ver MinhaProdutividadePage: antes desse endpoint existir, a tela usava
 * useProdutividadeMecanico(usuarioId, ...) contra o endpoint geral por id, que
 * exige PRODUTIVIDADE_READ — permissão que também libera ver QUALQUER outro
 * mecânico/consultor, um vazamento real pra quem só devia ver os próprios
 * números.
 */
export function useProdutividadeMecanicoMe(mes: string) {
  return useQuery({
    queryKey: produtividadeKeys.mecanicoMe(mes),
    queryFn: () => produtividadeApi.mecanicoMe(mes),
    refetchInterval: intervaloSeMesCorrente(mes),
  });
}
