import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { AgendamentoResponse, OrcamentoResponse, OrdemServicoResponse } from '@/api/types';

export type AgendaView = 'mes' | 'semana' | 'dia';

/** Semana começa no domingo, como no calendário que a oficina já usa no dia a dia. */
const WEEK_OPTS = { weekStartsOn: 0 } as const;

/**
 * Capacidade de referência por dia para o indicador de carga. O backend não
 * expõe capacidade da oficina (ver docs/backend-agenda-kanban.md), então é uma
 * constante de UX: só pinta o dia de verde/âmbar/vermelho.
 */
export const CAPACIDADE_DIA = 8;

export type CargaNivel = 'vazio' | 'baixa' | 'media' | 'alta';

export function nivelCarga(qtd: number, capacidade = CAPACIDADE_DIA): CargaNivel {
  if (qtd <= 0) return 'vazio';
  const ratio = qtd / capacidade;
  if (ratio >= 1) return 'alta';
  if (ratio >= 0.5) return 'media';
  return 'baixa';
}

export function dayKey(d: Date | string): string {
  return format(typeof d === 'string' ? new Date(d) : d, 'yyyy-MM-dd');
}

/** Intervalo (inclusive) que a visão precisa carregar — na visão mês inclui os dias das semanas vizinhas exibidas na grade. */
export function intervaloDaVisao(view: AgendaView, cursor: Date): { inicio: Date; fim: Date } {
  if (view === 'dia') return { inicio: startOfDay(cursor), fim: endOfDay(cursor) };
  if (view === 'semana') return { inicio: startOfWeek(cursor, WEEK_OPTS), fim: endOfWeek(cursor, WEEK_OPTS) };
  return {
    inicio: startOfWeek(startOfMonth(cursor), WEEK_OPTS),
    fim: endOfWeek(endOfMonth(cursor), WEEK_OPTS),
  };
}

export function diasDoIntervalo(inicio: Date, fim: Date): Date[] {
  const dias: Date[] = [];
  for (let d = startOfDay(inicio); d <= fim; d = addDays(d, 1)) dias.push(d);
  return dias;
}

export function navegar(view: AgendaView, cursor: Date, delta: -1 | 1): Date {
  if (view === 'dia') return addDays(cursor, delta);
  if (view === 'semana') return addWeeks(cursor, delta);
  return addMonths(cursor, delta);
}

// ---------------------------------------------------------------------------
// Agendamento → Orçamento → OS
//
// O backend já liga os três: `Orcamento.agendamentoId` e `OrdemServico.orcamentoId`. Esse vínculo
// exato é a fonte da verdade. Só quando o agendamento não tem orçamento (dados antigos) cai-se
// numa heurística por veículo — marcada em `vinculo: 'veiculo'`.
//
// Quem inicia, pausa, pede peça e conclui o serviço é o técnico, na OS. Por isso o quadro e os
// indicadores usam o STATUS EFETIVO: o da OS quando existe, senão o do agendamento.
// ---------------------------------------------------------------------------

export type StatusEfetivo =
  | 'AGENDADO'
  | 'CONFIRMADO'
  | 'NA_FILA'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_PECAS'
  | 'CONCLUIDO'
  | 'CANCELADO';

/** Onde o agendamento está no caminho recepção → orçamento → OS. */
export type Etapa =
  | 'SEM_ORCAMENTO'
  | 'ORCAMENTO_RASCUNHO'
  | 'ORCAMENTO_ENVIADO'
  | 'ORCAMENTO_APROVADO'
  | 'ORCAMENTO_ENCERRADO'
  | 'COM_OS';

export const ETAPA_LABEL: Record<Etapa, string> = {
  SEM_ORCAMENTO: 'Sem orçamento',
  ORCAMENTO_RASCUNHO: 'Orçamento em rascunho',
  ORCAMENTO_ENVIADO: 'Aguardando o cliente',
  ORCAMENTO_APROVADO: 'Aprovado — gerar OS',
  ORCAMENTO_ENCERRADO: 'Orçamento rejeitado/expirado',
  COM_OS: 'OS criada',
};

export interface AgendaItem {
  ag: AgendamentoResponse;
  orcamento?: OrcamentoResponse;
  os?: OrdemServicoResponse;
  status: StatusEfetivo;
  etapa: Etapa;
  vinculo: 'exato' | 'veiculo' | 'nenhum';
}

const OS_EM_ABERTO = ['AGUARDANDO_PECA', 'EM_ANDAMENTO', 'PAUSADA', 'APROVADA', 'AGUARDANDO_APROVACAO', 'ABERTA'];
const OS_ENCERRADA = ['CONCLUIDA', 'FATURADO', 'ENTREGUE'];
/** Quanto menor o índice, mais relevante para representar o veículo no pátio. */
const PRIORIDADE_OS = [...OS_EM_ABERTO, ...OS_ENCERRADA];
/** Orçamento mais "avançado" ganha quando um agendamento tem mais de um. */
const PRIORIDADE_ORCAMENTO = ['CONVERTIDO', 'APROVADO', 'ENVIADO', 'RASCUNHO', 'REJEITADO', 'EXPIRADO'];

export function osEmAberto(os: OrdemServicoResponse): boolean {
  return os.status != null && OS_EM_ABERTO.includes(os.status);
}

export interface Vinculos {
  osPorVeiculo: Map<number, OrdemServicoResponse[]>;
  osPorOrcamento: Map<number, OrdemServicoResponse>;
  orcamentoPorAgendamento: Map<number, OrcamentoResponse>;
}

export function indexar(ordens: OrdemServicoResponse[] | undefined, orcamentos: OrcamentoResponse[] | undefined): Vinculos {
  const osPorVeiculo = new Map<number, OrdemServicoResponse[]>();
  const osPorOrcamento = new Map<number, OrdemServicoResponse>();
  for (const os of ordens ?? []) {
    if (os.status === 'CANCELADA') continue;
    if (os.orcamentoId != null) osPorOrcamento.set(os.orcamentoId, os);
    if (os.veiculoId != null) osPorVeiculo.set(os.veiculoId, [...(osPorVeiculo.get(os.veiculoId) ?? []), os]);
  }
  const orcamentoPorAgendamento = new Map<number, OrcamentoResponse>();
  for (const orc of orcamentos ?? []) {
    if (orc.agendamentoId == null) continue;
    const atual = orcamentoPorAgendamento.get(orc.agendamentoId);
    const rank = (o: OrcamentoResponse) => PRIORIDADE_ORCAMENTO.indexOf(o.status ?? '');
    if (!atual || rank(orc) < rank(atual)) orcamentoPorAgendamento.set(orc.agendamentoId, orc);
  }
  return { osPorVeiculo, osPorOrcamento, orcamentoPorAgendamento };
}

/** Fallback para agendamento sem orçamento: OS do mesmo veículo (só hoje/passado; OS encerrada só se concluída no/depois do dia). */
function osPorHeuristicaDeVeiculo(ag: AgendamentoResponse, v: Vinculos, hoje: Date): OrdemServicoResponse | undefined {
  if (ag.veiculoId == null || !ag.dataHora) return undefined;
  const diaAg = startOfDay(new Date(ag.dataHora));
  if (diaAg > endOfDay(hoje)) return undefined;
  const candidatas = (v.osPorVeiculo.get(ag.veiculoId) ?? []).filter((os) => {
    if (osEmAberto(os)) return true;
    const ref = os.dataConclusao ?? os.dataAbertura;
    return ref != null && new Date(ref) >= diaAg;
  });
  return candidatas.sort((a, b) => PRIORIDADE_OS.indexOf(a.status ?? '') - PRIORIDADE_OS.indexOf(b.status ?? ''))[0];
}

function etapaDoOrcamento(orc?: OrcamentoResponse): Etapa {
  switch (orc?.status) {
    case undefined:
      return 'SEM_ORCAMENTO';
    case 'RASCUNHO':
      return 'ORCAMENTO_RASCUNHO';
    case 'ENVIADO':
      return 'ORCAMENTO_ENVIADO';
    case 'APROVADO':
      return 'ORCAMENTO_APROVADO';
    case 'CONVERTIDO':
      return 'COM_OS';
    default:
      return 'ORCAMENTO_ENCERRADO';
  }
}

export function statusEfetivo(ag: AgendamentoResponse, os: OrdemServicoResponse | undefined, hoje = new Date()): StatusEfetivo {
  if (ag.status === 'CANCELADO') return 'CANCELADO';
  if (ag.status === 'CONCLUIDO') return 'CONCLUIDO';
  const base: StatusEfetivo = ag.status === 'CONFIRMADO' ? 'CONFIRMADO' : ag.status === 'EM_ANDAMENTO' ? 'EM_ANDAMENTO' : 'AGENDADO';
  switch (os?.status) {
    case 'AGUARDANDO_PECA':
      return 'AGUARDANDO_PECAS';
    case 'EM_ANDAMENTO':
    case 'PAUSADA':
      return 'EM_ANDAMENTO';
    case 'CONCLUIDA':
    case 'FATURADO':
    case 'ENTREGUE':
      return 'CONCLUIDO';
    case 'ABERTA':
    case 'AGUARDANDO_APROVACAO':
    case 'APROVADA': {
      // OS já existe esperando o técnico. Mas se o agendamento é de um dia futuro o veículo ainda não chegou.
      const futuro = ag.dataHora != null && startOfDay(new Date(ag.dataHora)) > endOfDay(hoje);
      return futuro ? base : 'NA_FILA';
    }
    default:
      return base;
  }
}

export function montarItens(
  agendamentos: AgendamentoResponse[] | undefined,
  ordens: OrdemServicoResponse[] | undefined,
  orcamentos?: OrcamentoResponse[],
  hoje = new Date(),
): AgendaItem[] {
  const v = indexar(ordens, orcamentos);
  return (agendamentos ?? []).map((ag) => {
    const orcamento = ag.id != null ? v.orcamentoPorAgendamento.get(ag.id) : undefined;
    let os = orcamento?.id != null ? v.osPorOrcamento.get(orcamento.id) : undefined;
    let vinculo: AgendaItem['vinculo'] = os ? 'exato' : 'nenhum';
    if (!os && !orcamento) {
      os = osPorHeuristicaDeVeiculo(ag, v, hoje);
      if (os) vinculo = 'veiculo';
    }
    const etapa: Etapa = os ? 'COM_OS' : etapaDoOrcamento(orcamento);
    return { ag, orcamento, os, status: statusEfetivo(ag, os, hoje), etapa, vinculo };
  });
}

/** Próxima ação da recepção/consultor para este agendamento (nada, quando já é do técnico ou acabou). */
export type ProximoPasso = 'CRIAR_ORCAMENTO' | 'ABRIR_ORCAMENTO' | 'GERAR_OS' | 'ABRIR_OS' | null;

export function proximoPasso(item: AgendaItem): ProximoPasso {
  if (item.status === 'CANCELADO') return null;
  if (item.os) return 'ABRIR_OS';
  if (item.status === 'CONCLUIDO') return null;
  switch (item.etapa) {
    case 'SEM_ORCAMENTO':
    case 'ORCAMENTO_ENCERRADO':
      return 'CRIAR_ORCAMENTO';
    case 'ORCAMENTO_APROVADO':
      return 'GERAR_OS';
    default:
      return 'ABRIR_ORCAMENTO';
  }
}

export function porHorario(a: AgendamentoResponse, b: AgendamentoResponse): number {
  return (a.dataHora ?? '').localeCompare(b.dataHora ?? '');
}

export function agruparPorDia(lista: AgendaItem[]): Map<string, AgendaItem[]> {
  const mapa = new Map<string, AgendaItem[]>();
  for (const item of [...lista].sort((a, b) => porHorario(a.ag, b.ag))) {
    if (!item.ag.dataHora) continue;
    const k = dayKey(item.ag.dataHora);
    mapa.set(k, [...(mapa.get(k) ?? []), item]);
  }
  return mapa;
}

/** Cancelados não ocupam a oficina — ficam visíveis no calendário, mas não entram na carga do dia. */
export function contaCarga(lista: AgendaItem[] | undefined): number {
  return (lista ?? []).filter((i) => i.status !== 'CANCELADO').length;
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

export interface FiltrosAgenda {
  busca: string;
  status: string;
  mecanicoId: string;
}

export const FILTROS_VAZIOS: FiltrosAgenda = { busca: '', status: '', mecanicoId: '' };

function normaliza(s?: string): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function passaFiltros(item: AgendaItem, f: FiltrosAgenda): boolean {
  if (f.status && item.status !== f.status) return false;
  if (f.mecanicoId && String(item.os?.usuarioResponsavelId ?? '') !== f.mecanicoId) return false;
  if (f.busca) {
    const { ag } = item;
    const alvo = normaliza(`${ag.clienteNome} ${ag.veiculoPlaca} ${ag.servicos?.map((s) => s.nome).join(' ')}`);
    if (!alvo.includes(normaliza(f.busca))) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Kanban — somente leitura: reflete o pátio, não comanda o serviço.
// ---------------------------------------------------------------------------

export type ColunaId = 'AGENDADO' | 'NA_FILA' | 'EM_ANDAMENTO' | 'AGUARDANDO_PECAS' | 'CONCLUIDO';

export interface ColunaDef {
  id: ColunaId;
  titulo: string;
  dica: string;
}

export const COLUNAS: ColunaDef[] = [
  { id: 'AGENDADO', titulo: 'Agendado', dica: 'Visita marcada, ainda sem OS esperando o técnico' },
  { id: 'NA_FILA', titulo: 'Na fila', dica: 'OS criada; aguardando o técnico iniciar' },
  { id: 'EM_ANDAMENTO', titulo: 'Em andamento', dica: 'Técnico executando o serviço' },
  { id: 'AGUARDANDO_PECAS', titulo: 'Aguardando peças', dica: 'Técnico sinalizou falta de peça na OS' },
  { id: 'CONCLUIDO', titulo: 'Concluído', dica: 'Serviço finalizado pelo técnico' },
];

export interface CardKanban {
  /** Chave estável: `ag-<id>` para agendamentos, `os-<id>` para OS sem agendamento. */
  key: string;
  coluna: ColunaId;
  item?: AgendaItem;
  os?: OrdemServicoResponse;
}

function colunaDoStatus(s: StatusEfetivo): ColunaId | null {
  if (s === 'CANCELADO') return null; // cancelado não aparece no quadro
  if (s === 'CONFIRMADO') return 'AGENDADO';
  return s;
}

function colunaDaOsAvulsa(os: OrdemServicoResponse): ColunaId | null {
  switch (os.status) {
    case 'AGUARDANDO_PECA':
      return 'AGUARDANDO_PECAS';
    case 'EM_ANDAMENTO':
    case 'PAUSADA':
      return 'EM_ANDAMENTO';
    case 'ABERTA':
    case 'AGUARDANDO_APROVACAO':
    case 'APROVADA':
      return 'NA_FILA';
    default:
      return null;
  }
}

export function montarCards(
  agendamentos: AgendamentoResponse[] | undefined,
  ordens: OrdemServicoResponse[] | undefined,
  orcamentos: OrcamentoResponse[] | undefined,
  filtros: FiltrosAgenda,
  hoje = new Date(),
): CardKanban[] {
  const itens = montarItens(agendamentos, ordens, orcamentos, hoje);
  const cards: CardKanban[] = [];
  const osJaRepresentadas = new Set<number>();
  const veiculosAgendadosAtivos = new Set<number>();

  for (const item of [...itens].sort((a, b) => porHorario(a.ag, b.ag))) {
    const coluna = colunaDoStatus(item.status);
    if (!coluna) continue;
    if (item.os?.id != null) osJaRepresentadas.add(item.os.id);
    if (item.status !== 'CONCLUIDO' && item.ag.veiculoId != null) veiculosAgendadosAtivos.add(item.ag.veiculoId);
    if (!passaFiltros(item, filtros)) continue;
    cards.push({ key: `ag-${item.ag.id}`, coluna, item, os: item.os });
  }

  // OS sem agendamento (cliente que chegou sem agendar): o veículo está na oficina mesmo assim,
  // então entra no quadro (somente leitura) em vez de sumir.
  for (const os of ordens ?? []) {
    const coluna = colunaDaOsAvulsa(os);
    if (!coluna || os.veiculoId == null || (os.id != null && osJaRepresentadas.has(os.id))) continue;
    if (veiculosAgendadosAtivos.has(os.veiculoId) || filtros.status) continue;
    if (filtros.mecanicoId && String(os.usuarioResponsavelId ?? '') !== filtros.mecanicoId) continue;
    if (filtros.busca && !normaliza(`${os.clienteNome} ${os.veiculoPlaca} ${os.numero}`).includes(normaliza(filtros.busca))) continue;
    cards.push({ key: `os-${os.id}`, coluna, os });
  }

  return cards;
}
