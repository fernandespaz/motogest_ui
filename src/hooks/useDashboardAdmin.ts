import { useMemo } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import type { AgendamentoResponse, OrdemServicoResponse } from '@/api/types';
import { useAuthStore } from '@/store/authStore';
import { useOrdensServico } from './useOrdensServico';
import { useAgendamentosPeriodo } from './useAgenda';

// Mesmo recorte do painel do consultor: GET /ordens-servico só pagina e filtra
// por um status por vez, então o funil lê as 100 OS mais recentes — cobre com
// folga o que está em andamento numa oficina; o histórico fica nos relatórios.
const PAGINA_RECENTE = { page: 0, size: 100, sort: 'id,desc' } as const;

export interface FunilOs {
  /** Aberta ou aguardando o cliente aprovar. */
  abertas: number;
  /** Aprovada, em andamento, aguardando peça ou pausada — o trabalho na oficina. */
  emExecucao: number;
  /** Concluída, esperando o caixa faturar (o veículo só sai depois de pago). */
  paraFaturar: number;
  /** Faturada, falta a entrega física. */
  paraEntregar: number;
}

const ABERTAS = new Set(['ABERTA', 'AGUARDANDO_APROVACAO']);
const EM_EXECUCAO = new Set(['APROVADA', 'EM_ANDAMENTO', 'AGUARDANDO_PECA', 'PAUSADA']);

/** Agrupa as OS ainda "vivas" por etapa — Entregue e Cancelada ficam de fora de propósito. */
export function resumirFunilOs(ordens: OrdemServicoResponse[]): FunilOs {
  const funil: FunilOs = { abertas: 0, emExecucao: 0, paraFaturar: 0, paraEntregar: 0 };
  for (const o of ordens) {
    const status = o.status ?? '';
    if (ABERTAS.has(status)) funil.abertas++;
    else if (EM_EXECUCAO.has(status)) funil.emExecucao++;
    else if (status === 'CONCLUIDA') funil.paraFaturar++;
    else if (status === 'FATURADO') funil.paraEntregar++;
  }
  return funil;
}

/** Dados extras do painel geral, cada consulta atrás da permissão do endpoint que lê. */
export function useDashboardAdmin() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const podeOs = hasPermission('ORDEM_SERVICO_READ');
  const podeAgenda = hasPermission('AGENDA_READ');

  const ordens = useOrdensServico(PAGINA_RECENTE, { enabled: podeOs, silentError: true });

  const hoje = useMemo(() => new Date(), []);
  const inicio = useMemo(() => (podeAgenda ? startOfDay(hoje).toISOString() : ''), [hoje, podeAgenda]);
  const fim = useMemo(() => (podeAgenda ? endOfDay(hoje).toISOString() : ''), [hoje, podeAgenda]);
  const agenda = useAgendamentosPeriodo(inicio, fim);

  const funil = useMemo(() => resumirFunilOs(ordens.data?.content ?? []), [ordens.data]);
  const agendaHoje: AgendamentoResponse[] = useMemo(
    () => [...(agenda.data ?? [])].sort((a, b) => (a.dataHora ?? '').localeCompare(b.dataHora ?? '')),
    [agenda.data],
  );

  return { funil, agendaHoje, carregandoOs: ordens.isLoading, carregandoAgenda: agenda.isLoading, podeOs, podeAgenda };
}
