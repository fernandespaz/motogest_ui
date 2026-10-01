import { useMemo } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import type { AgendamentoResponse, OrcamentoResponse, OrdemServicoResponse } from '@/api/types';
import { useAuthStore } from '@/store/authStore';
import { mesReferenciaAtual } from '@/lib/formatters';
import { useOrcamentos } from './useOrcamentos';
import { useOrdensServico } from './useOrdensServico';
import { useAgendamentosPeriodo } from './useAgenda';
import { useProdutividadeConsultor } from './useProdutividade';

// Nenhum endpoint filtra por consultor (GET /orcamentos só pagina; GET
// /ordens-servico filtra por status/técnico, não por consultor), então o
// painel lê as páginas mais recentes e separa o que é da pessoa pelo
// consultorId de cada registro. 100 cobre com folga o que ainda está em
// aberto no dia a dia de uma oficina; o histórico completo fica no relatório
// de produtividade.
const PAGINA_RECENTE = { page: 0, size: 100, sort: 'id,desc' } as const;

const OS_EM_EXECUCAO = new Set(['APROVADA', 'EM_ANDAMENTO', 'PAUSADA', 'AGUARDANDO_PECA']);

export interface CarteiraConsultor {
  aguardandoCliente: OrcamentoResponse[];
  aprovadosSemOs: OrcamentoResponse[];
  osEmExecucao: OrdemServicoResponse[];
  /**
   * Regra de negócio: o veículo só é liberado pro cliente depois de pago —
   * por isso CONCLUIDA (trabalho pronto, ainda não faturada) e FATURADO (já
   * paga, falta só a entrega física) são etapas distintas, cada uma esperando
   * uma ação de pessoas diferentes (o caixa fatura; o consultor entrega).
   */
  osProntasParaFaturar: OrdemServicoResponse[];
  /** Só FATURADO — ENTREGUE só existe vindo daqui, então uma vez entregue ela sai desta lista. */
  osProntasParaEntrega: OrdemServicoResponse[];
  /**
   * OS já entregues, mais recente primeiro — recorte das últimas 100 (mesma
   * limitação de PAGINA_RECENTE), não um relatório fechado por mês: GET
   * /ordens-servico não tem filtro de período nem existe campo de "data de
   * entrega" no schema, só `dataConclusao`. Pra um relatório mensal de
   * verdade ("entregues em janeiro"), o backend precisaria expor isso —
   * histórico completo por enquanto só existe no `numero`/PDF de cada OS.
   */
  osEntregues: OrdemServicoResponse[];
  /** Clientes distintos que a pessoa já atendeu (orçamento ou OS) — a carteira visível no período carregado. */
  clientesNaCarteira: number;
}

/** Separa, das páginas recentes, o que pertence ao consultor — função pura pra ficar testável. */
export function resumirCarteiraConsultor(
  orcamentos: OrcamentoResponse[],
  ordens: OrdemServicoResponse[],
  consultorId: number,
): CarteiraConsultor {
  const meus = orcamentos.filter((o) => o.consultorId === consultorId);
  const minhasOs = ordens.filter((o) => o.consultorId === consultorId);
  // Mais antigo primeiro: quem espera há mais tempo é quem precisa de follow-up.
  const porEmissao = (a: OrcamentoResponse, b: OrcamentoResponse) =>
    (a.dataEmissao ?? a.createdAt ?? '').localeCompare(b.dataEmissao ?? b.createdAt ?? '');
  const clientes = new Set(
    [...meus.map((o) => o.clienteId), ...minhasOs.map((o) => o.clienteId)].filter((id): id is number => id != null),
  );

  // Mais recente primeiro (por conclusão, já que não existe data de entrega).
  const porConclusaoDesc = (a: OrdemServicoResponse, b: OrdemServicoResponse) =>
    (b.dataConclusao ?? '').localeCompare(a.dataConclusao ?? '');

  return {
    aguardandoCliente: meus.filter((o) => o.status === 'ENVIADO').sort(porEmissao),
    aprovadosSemOs: meus.filter((o) => o.status === 'APROVADO').sort(porEmissao),
    osEmExecucao: minhasOs.filter((o) => OS_EM_EXECUCAO.has(o.status ?? '')),
    osProntasParaFaturar: minhasOs.filter((o) => o.status === 'CONCLUIDA'),
    osProntasParaEntrega: minhasOs.filter((o) => o.status === 'FATURADO'),
    osEntregues: minhasOs.filter((o) => o.status === 'ENTREGUE').sort(porConclusaoDesc),
    clientesNaCarteira: clientes.size,
  };
}

/**
 * Tudo que o painel do consultor precisa, cada consulta atrás da permissão
 * que o endpoint exige (sem ela a seção correspondente simplesmente não
 * aparece — ver prohibited-actions #2).
 */
export function useDashboardConsultor() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const usuarioId = useAuthStore((s) => s.usuarioId) ?? undefined;

  const podeOrcamentos = hasPermission('ORCAMENTO_READ');
  const podeOs = hasPermission('ORDEM_SERVICO_READ');
  const podeAgenda = hasPermission('AGENDA_READ');
  const podeProdutividade = hasPermission('PRODUTIVIDADE_READ');

  const orcamentos = useOrcamentos(PAGINA_RECENTE, { enabled: podeOrcamentos });
  const ordens = useOrdensServico(PAGINA_RECENTE, { enabled: podeOs });

  const hoje = useMemo(() => new Date(), []);
  const inicio = useMemo(() => (podeAgenda ? startOfDay(hoje).toISOString() : ''), [hoje, podeAgenda]);
  const fim = useMemo(() => (podeAgenda ? endOfDay(hoje).toISOString() : ''), [hoje, podeAgenda]);
  const agenda = useAgendamentosPeriodo(inicio, fim);

  const produtividade = useProdutividadeConsultor(podeProdutividade ? usuarioId : undefined, mesReferenciaAtual());

  const carteira = useMemo(
    () =>
      usuarioId
        ? resumirCarteiraConsultor(orcamentos.data?.content ?? [], ordens.data?.content ?? [], usuarioId)
        : resumirCarteiraConsultor([], [], 0),
    [orcamentos.data, ordens.data, usuarioId],
  );

  const agendaHoje: AgendamentoResponse[] = useMemo(
    () => [...(agenda.data ?? [])].sort((a, b) => (a.dataHora ?? '').localeCompare(b.dataHora ?? '')),
    [agenda.data],
  );

  return {
    carteira,
    agendaHoje,
    produtividade: produtividade.data,
    permissoes: { podeOrcamentos, podeOs, podeAgenda },
    isLoading: (podeOrcamentos && orcamentos.isLoading) || (podeOs && ordens.isLoading),
  };
}
