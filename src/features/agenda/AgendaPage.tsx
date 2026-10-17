import { useMemo, useState } from 'react';
import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAgendamentosPeriodo, useAtualizarStatusAgendamento } from '@/hooks/useAgenda';
import { useOrdensServico, useCriarOSAPartirDeOrcamento } from '@/hooks/useOrdensServico';
import { useTodosOrcamentos } from '@/hooks/useOrcamentos';
import { useNavigate } from 'react-router-dom';
import type { AgendamentoResponse, AgendamentoStatus } from '@/api/types';
import { agendamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { AgendamentoFormModal } from './AgendamentoFormModal';
import { AgendamentoDetalheModal } from './AgendamentoDetalheModal';
import { AgendaCalendario } from './AgendaCalendario';
import { AgendaKanban } from './AgendaKanban';
import {
  FILTROS_VAZIOS,
  agruparPorDia,
  intervaloDaVisao,
  montarCards,
  montarItens,
  navegar,
  passaFiltros,
  type AgendaView,
  type FiltrosAgenda,
  type StatusEfetivo,
  type AgendaItem,
  type ProximoPasso,
} from './agendaUtils';

// Status efetivo (o da OS do técnico quando existe) — é o que a oficina enxerga, não o cru do agendamento.
const STATUS_FILTRO: StatusEfetivo[] = [
  'AGENDADO',
  'CONFIRMADO',
  'NA_FILA',
  'EM_ANDAMENTO',
  'AGUARDANDO_PECAS',
  'CONCLUIDO',
  'CANCELADO',
];
const VISOES: { id: AgendaView; label: string }[] = [
  { id: 'mes', label: 'Mês' },
  { id: 'semana', label: 'Semana' },
  { id: 'dia', label: 'Dia' },
];
/** O quadro olha para o pátio: o que ficou para trás nas últimas 2 semanas e o que vem no próximo mês. */
const KANBAN_DIAS_ATRAS = 14;
const KANBAN_DIAS_FRENTE = 30;

function tituloPeriodo(view: AgendaView, cursor: Date) {
  if (view === 'mes') return format(cursor, "MMMM 'de' yyyy", { locale: ptBR });
  if (view === 'dia') return format(cursor, "EEEE, d 'de' MMMM", { locale: ptBR });
  const { inicio, fim } = intervaloDaVisao('semana', cursor);
  return `${format(inicio, "d 'de' MMM", { locale: ptBR })} – ${format(fim, "d 'de' MMM", { locale: ptBR })}`;
}

export function AgendaPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const podeEditar = hasPermission('AGENDA_WRITE');
  const navigate = useNavigate();
  const permissoesFluxo = {
    editarAgenda: podeEditar,
    escreverOrcamento: hasPermission('ORCAMENTO_WRITE'),
    lerOrcamento: hasPermission('ORCAMENTO_READ'),
    lerOs: hasPermission('ORDEM_SERVICO_READ'),
  };

  const [aba, setAba] = useState<'calendario' | 'quadro'>('calendario');
  const [view, setView] = useState<AgendaView>('mes');
  const [cursor, setCursor] = useState(() => new Date());
  const [filtros, setFiltros] = useState<FiltrosAgenda>(FILTROS_VAZIOS);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [form, setForm] = useState<{
    agendamento: AgendamentoResponse | null;
    data?: string;
  } | null>(null);

  // Janela de busca: calendário usa o período visível; o quadro usa uma janela fixa em torno de hoje.
  const janela = useMemo(() => {
    if (aba === 'quadro') {
      const hoje = new Date();
      return {
        inicio: startOfDay(addDays(hoje, -KANBAN_DIAS_ATRAS)),
        fim: endOfDay(addDays(hoje, KANBAN_DIAS_FRENTE)),
      };
    }
    return intervaloDaVisao(view, cursor);
  }, [aba, view, cursor]);
  const inicioIso = useMemo(() => janela.inicio.toISOString(), [janela]);
  const fimIso = useMemo(() => janela.fim.toISOString(), [janela]);

  const { data: agendamentos, isLoading } = useAgendamentosPeriodo(inicioIso, fimIso);
  // OS dá o mecânico e o "aguardando peça" — sem ORDEM_SERVICO_READ o front só esconde esses dados (ver docs/backend-agenda-kanban.md).
  const { data: ordensPage } = useOrdensServico(
    { size: 200, sort: 'id,desc' },
    { enabled: hasPermission('ORDEM_SERVICO_READ'), silentError: true },
  );
  const ordens = ordensPage?.content;
  // Orçamento é o elo exato agendamento → OS (Orcamento.agendamentoId / OrdemServico.orcamentoId).
  const { data: orcamentos } = useTodosOrcamentos(undefined, {
    enabled: hasPermission('ORCAMENTO_READ'),
    silentError: true,
  });
  const itens = useMemo(() => montarItens(agendamentos, ordens, orcamentos), [agendamentos, ordens, orcamentos]);

  const mecanicos = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const os of ordens ?? []) {
      if (os.usuarioResponsavelId != null && os.usuarioResponsavelNome)
        mapa.set(os.usuarioResponsavelId, os.usuarioResponsavelNome);
    }
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1]));
  }, [ordens]);

  const filtrados = useMemo(() => itens.filter((i) => passaFiltros(i, filtros)), [itens, filtros]);
  const porDia = useMemo(() => agruparPorDia(filtrados), [filtrados]);
  const cards = useMemo(
    () => montarCards(agendamentos, ordens, orcamentos, filtros),
    [agendamentos, ordens, orcamentos, filtros],
  );

  const atualizarStatus = useAtualizarStatusAgendamento();
  async function mudarStatus(ag: AgendamentoResponse, status: AgendamentoStatus) {
    try {
      await atualizarStatus.mutateAsync({ id: ag.id!, status });
      toast.success(`${ag.veiculoPlaca ?? 'Agendamento'}: ${metaFor(agendamentoStatusMeta, status).label}.`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível atualizar o status.'));
    }
  }

  const criarOS = useCriarOSAPartirDeOrcamento();
  async function seguirFluxo(item: AgendaItem, passo: Exclude<ProximoPasso, null>) {
    const { ag, orcamento, os } = item;
    switch (passo) {
      case 'CRIAR_ORCAMENTO':
        return navigate(`/orcamentos/novo?agendamentoId=${ag.id}`);
      case 'ABRIR_ORCAMENTO':
        return navigate(`/orcamentos/${orcamento?.id}`);
      case 'ABRIR_OS':
        return navigate(`/ordens-servico/${os?.id}`);
      case 'GERAR_OS':
        try {
          const nova = await criarOS.mutateAsync({ orcamentoId: orcamento!.id! });
          toast.success(`OS ${nova.numero ?? ''} criada — já está na fila do técnico.`);
          setDetalheId(null);
        } catch (error) {
          toast.error(extractErrorMessage(error, 'Não foi possível gerar a OS.'));
        }
    }
  }

  const filtrosAtivos = filtros.busca || filtros.status || filtros.mecanicoId;
  const detalhe = useMemo(() => itens.find((i) => i.ag.id === detalheId) ?? null, [itens, detalheId]);

  function abrirDia(d: Date) {
    setCursor(d);
    setView('dia');
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Calendário e quadro da oficina"
        action={
          podeEditar ? (
            <Button
              onClick={() =>
                setForm({
                  agendamento: null,
                  data: format(cursor, "yyyy-MM-dd'T'09:00"),
                })
              }
            >
              <Plus size={18} /> Novo agendamento
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={[
          { key: 'calendario', label: 'Calendário' },
          { key: 'quadro', label: 'Quadro (Kanban)' },
        ]}
        active={aba}
        onChange={(k) => setAba(k as 'calendario' | 'quadro')}
      />

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-4">
          <Input
            placeholder="Buscar placa, cliente ou serviço…"
            aria-label="Buscar"
            value={filtros.busca}
            onChange={(e) => setFiltros((f) => ({ ...f, busca: e.target.value }))}
          />
        </div>
        <div className="lg:col-span-3">
          <Select
            aria-label="Filtrar por status"
            value={filtros.status}
            onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Todos os status</option>
            {STATUS_FILTRO.map((s) => (
              <option key={s} value={s}>
                {metaFor(agendamentoStatusMeta, s).label}
              </option>
            ))}
          </Select>
        </div>
        <div className="lg:col-span-3">
          <Select
            aria-label="Filtrar por mecânico"
            value={filtros.mecanicoId}
            onChange={(e) => setFiltros((f) => ({ ...f, mecanicoId: e.target.value }))}
            disabled={mecanicos.length === 0}
          >
            <option value="">{mecanicos.length === 0 ? 'Mecânico (sem OS)' : 'Todos os mecânicos'}</option>
            {mecanicos.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <Button fullWidth variant="secondary" disabled={!filtrosAtivos} onClick={() => setFiltros(FILTROS_VAZIOS)}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <TabPanel hidden={aba !== 'calendario'}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCursor((c) => navegar(view, c, -1))}
              aria-label="Período anterior"
            >
              <ChevronLeft size={18} />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCursor(new Date())}>
              Hoje
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCursor((c) => navegar(view, c, 1))}
              aria-label="Próximo período"
            >
              <ChevronRight size={18} />
            </Button>
            <h2 className="ml-2 flex items-center gap-2 text-base font-semibold text-ink first-letter:uppercase">
              <CalendarDays size={18} className="text-brand-600" aria-hidden />
              {tituloPeriodo(view, cursor)}
            </h2>
          </div>
          <div role="group" aria-label="Visão" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {VISOES.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className={clsx(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  view === v.id ? 'bg-brand-600 text-white' : 'text-ink-muted hover:text-ink',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <PageSpinner />
        ) : (
          <AgendaCalendario
            view={view}
            cursor={cursor}
            porDia={porDia}
            onAbrirDia={abrirDia}
            onAbrirAgendamento={(i) => setDetalheId(i.ag.id ?? null)}
            onNovo={
              podeEditar
                ? (d) =>
                    setForm({
                      agendamento: null,
                      data: format(d, "yyyy-MM-dd'T'09:00"),
                    })
                : undefined
            }
          />
        )}
      </TabPanel>

      <TabPanel hidden={aba !== 'quadro'}>
        {isLoading ? (
          <PageSpinner />
        ) : (
          <>
            <p className="mb-2 text-xs text-ink-muted">
              Mostrando de {format(janela.inicio, 'dd/MM')} a {format(janela.fim, 'dd/MM')}.
              {' O quadro reflete o que o técnico registra nas OS — não é possível mover cards.'}
            </p>
            <AgendaKanban cards={cards} onAbrir={(i) => setDetalheId(i.ag.id ?? null)} />
          </>
        )}
      </TabPanel>

      <AgendamentoDetalheModal
        item={detalhe}
        permissoes={permissoesFluxo}
        ocupado={atualizarStatus.isPending || criarOS.isPending}
        onClose={() => setDetalheId(null)}
        onEditar={(ag) => {
          setDetalheId(null);
          setForm({ agendamento: ag });
        }}
        onStatus={mudarStatus}
        onPasso={seguirFluxo}
      />

      <AgendamentoFormModal
        open={form !== null}
        onClose={() => setForm(null)}
        agendamento={form?.agendamento}
        defaultDate={form?.data}
        onSalvoParaOrcamento={(id) => navigate(`/orcamentos/novo?agendamentoId=${id}`)}
      />
    </div>
  );
}
