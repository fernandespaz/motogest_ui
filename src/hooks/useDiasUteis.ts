import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { oficinasApi } from '@/api/endpoints/oficinas';
import type { DiasUteisResponse } from '@/api/types';

// Feriado de um mês praticamente não muda: um dia de cache evita refazer a consulta a cada abertura de tela.
const UM_DIA = 24 * 60 * 60 * 1000;

export const diasUteisKeys = {
  all: ['oficina', 'dias-uteis'] as const,
  mes: (mes?: string) => ['oficina', 'dias-uteis', mes ?? 'atual'] as const,
};

/** Dias úteis de um mês (yyyy-MM, padrão = mês corrente) descontando feriados nacionais e os da UF da oficina. */
export function useDiasUteis(mes?: string) {
  return useQuery({
    queryKey: diasUteisKeys.mes(mes),
    queryFn: () => oficinasApi.diasUteis(mes),
    staleTime: UM_DIA,
    // é informação de apoio (sugestão/previsão): se falhar, a tela segue sem ela
    meta: { hasLocalErrorHandling: true },
  });
}

/**
 * Feriados de vários meses de uma vez — o que as telas que calculam "5º dia útil" precisam. Devolve o conjunto
 * de datas (yyyy-MM-dd) e se a oficina está sem UF (aí só os nacionais foram considerados).
 */
export function useFeriadosDosMeses(meses: string[]) {
  const resultados = useQueries({
    queries: meses.map((mes) => ({
      queryKey: diasUteisKeys.mes(mes),
      queryFn: () => oficinasApi.diasUteis(mes),
      staleTime: UM_DIA,
      meta: { hasLocalErrorHandling: true },
    })),
  });

  const assinatura = resultados.map((r) => r.dataUpdatedAt).join(',');
  return useMemo(() => {
    const respostas = resultados.map((r) => r.data).filter((d): d is DiasUteisResponse => !!d);
    return {
      feriados: new Set(respostas.flatMap((d) => d.feriados.map((f) => f.data))),
      semUf: respostas.length > 0 && respostas.every((d) => d.uf == null),
    };
    // `resultados` muda de identidade a cada render; a assinatura muda só quando algum dado chega
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura]);
}
