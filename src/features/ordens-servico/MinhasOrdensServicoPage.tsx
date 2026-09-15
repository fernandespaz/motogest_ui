import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  LogOut,
  RefreshCw,
  Inbox,
  MessageSquareText,
  Wrench,
  Package,
  ClipboardList,
} from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { useOrdensServico, useTimerStartOS, useTimerPauseOS, useTimerResumeOS, useAtualizarStatusOS } from '@/hooks/useOrdensServico';
import { useAuthStore } from '@/store/authStore';
import type { OrdemServicoResponse } from '@/api/types';
import { formatMinutosParaHoras, formatDateTime, getInitials } from '@/lib/formatters';
import { ordemServicoStatusMeta, metaFor } from '@/lib/statusMeta';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { PausarOSModal } from './PausarOSModal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ModeloVeiculoThumb, useImagensPorVeiculoId } from '@/features/shared/ModeloVeiculoField';

export function MinhasOrdensServicoPage() {
  const navigate = useNavigate();
  const nome = useAuthStore((s) => s.nome);
  const usuarioId = useAuthStore((s) => s.usuarioId);
  const logout = useAuthStore((s) => s.logout);

  const [aba, setAba] = useState<'inicio' | 'andamento'>('inicio');
  const [busca, setBusca] = useState('');
  const [pausando, setPausando] = useState<OrdemServicoResponse | null>(null);
  const [motivoPausa, setMotivoPausa] = useState('');

  // A API só aceita um único `status` por requisição (sem OR), e essa tela
  // precisa dos contadores das duas abas ao mesmo tempo — por isso são 4
  // queries, uma por status, em vez de uma lista geral filtrada no cliente.
  // Isso também evita que status concluídos/antigos (fora do escopo desta
  // tela) ocupem espaço numa página só e empurrem OS ativas recentes para
  // fora do corte de paginação à medida que o histórico do técnico cresce.
  const paramsComuns = {
    size: 100,
    sort: 'dataPrevisao,asc',
    usuarioResponsavelId: usuarioId ?? undefined,
  };
  const aprovadaQuery = useOrdensServico({ ...paramsComuns, status: 'APROVADA' });
  const emAndamentoQuery = useOrdensServico({ ...paramsComuns, status: 'EM_ANDAMENTO' });
  const pausadaQuery = useOrdensServico({ ...paramsComuns, status: 'PAUSADA' });
  const aguardandoPecaQuery = useOrdensServico({ ...paramsComuns, status: 'AGUARDANDO_PECA' });
  const imagensPorVeiculoId = useImagensPorVeiculoId();

  const isLoading =
    aprovadaQuery.isLoading || emAndamentoQuery.isLoading || pausadaQuery.isLoading || aguardandoPecaQuery.isLoading;
  const isFetching =
    aprovadaQuery.isFetching || emAndamentoQuery.isFetching || pausadaQuery.isFetching || aguardandoPecaQuery.isFetching;
  function refetch() {
    aprovadaQuery.refetch();
    emAndamentoQuery.refetch();
    pausadaQuery.refetch();
    aguardandoPecaQuery.refetch();
  }

  const timerStart = useTimerStartOS();
  const timerPause = useTimerPauseOS();
  const timerResume = useTimerResumeOS();
  const atualizarStatus = useAtualizarStatusOS();

  const aguardandoInicio: OrdemServicoResponse[] = aprovadaQuery.data?.content ?? [];
  const emAndamento: OrdemServicoResponse[] = [
    ...(emAndamentoQuery.data?.content ?? []),
    ...(pausadaQuery.data?.content ?? []),
    ...(aguardandoPecaQuery.data?.content ?? []),
  ];

  const listaAtual = aba === 'inicio' ? aguardandoInicio : emAndamento;
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = !termo
      ? listaAtual
      : listaAtual.filter((os: OrdemServicoResponse) => os.numero?.toLowerCase().includes(termo));
    // Mais urgente primeiro: tempo estourado sobe pro topo, resto mantém a
    // ordenação por previsão de conclusão que já veio da API.
    return [...base].sort((a, b) => Number(b.tempoEstourado) - Number(a.tempoEstourado));
  }, [listaAtual, busca]);

  async function handleIniciar(os: OrdemServicoResponse) {
    try {
      await timerStart.mutateAsync(os.id!);
      toast.success(`OS ${os.numero} iniciada.`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível iniciar a OS.'));
    }
  }

  async function handleRetomar(os: OrdemServicoResponse) {
    try {
      if (os.status === 'AGUARDANDO_PECA') {
        await atualizarStatus.mutateAsync({ id: os.id!, status: 'EM_ANDAMENTO' });
      } else {
        await timerResume.mutateAsync(os.id!);
      }
      toast.success(`OS ${os.numero} retomada.`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível retomar a OS.'));
    }
  }

  async function handleFinalizar(os: OrdemServicoResponse) {
    try {
      await atualizarStatus.mutateAsync({ id: os.id!, status: 'CONCLUIDA' });
      toast.success(`OS ${os.numero} concluída.`);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível concluir a OS.'));
    }
  }

  async function handleConfirmarPausa() {
    if (!pausando || !motivoPausa.trim()) return;
    try {
      await timerPause.mutateAsync({ id: pausando.id!, motivo: motivoPausa.trim() });
      toast.success(`OS ${pausando.numero} pausada.`);
      setPausando(null);
      setMotivoPausa('');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível pausar a OS.'));
    }
  }

  return (
    <div className="-m-4 min-h-screen bg-surface-alt sm:-m-6">
      <div className="flex items-center justify-between bg-graphite px-4 py-4 text-white sm:px-6">
        <div>
          <h1 className="font-display text-lg font-bold">Minhas Ordens de Serviço</h1>
          <p className="text-sm text-slate-400">Olá, {nome?.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="dark" />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold">
            {getInitials(nome ?? '?')}
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6">
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setAba('inicio')}
            className={
              aba === 'inicio'
                ? 'flex items-center justify-center gap-2 rounded-xl bg-graphite px-3 py-3 text-sm font-semibold text-white'
                : 'flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold text-ink-muted'
            }
          >
            Aguardando início
            <span
              className={
                aba === 'inicio'
                  ? 'flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs'
                  : 'flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-alt px-1 text-xs text-ink-muted'
              }
            >
              {aguardandoInicio.length}
            </span>
          </button>
          <button
            onClick={() => setAba('andamento')}
            className={
              aba === 'andamento'
                ? 'flex items-center justify-center gap-2 rounded-xl bg-graphite px-3 py-3 text-sm font-semibold text-white'
                : 'flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold text-ink-muted'
            }
          >
            Em andamento
            <span
              className={
                aba === 'andamento'
                  ? 'flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs'
                  : 'flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-alt px-1 text-xs text-ink-muted'
              }
            >
              {emAndamento.length}
            </span>
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar por número da OS..." className="flex-1" />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Atualizar lista"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted hover:bg-surface-alt disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <Inbox size={32} className="text-ink-muted" />
            <p className="text-sm font-medium text-ink-muted">
              {busca
                ? 'Nenhuma OS encontrada com esse número.'
                : aba === 'inicio'
                  ? 'Nenhuma OS aguardando início atribuída a você.'
                  : 'Nenhuma OS em andamento atribuída a você.'}
            </p>
            <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
              <RefreshCw size={14} /> Atualizar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtradas.map((os) => {
              const meta = metaFor(ordemServicoStatusMeta, os.status);
              const estourado = !!os.tempoEstourado;
              const servicos = (os.itens ?? []).filter((item) => item.tipoItem === 'SERVICO');
              const pecas = (os.itens ?? []).filter((item) => item.tipoItem === 'PRODUTO');
              return (
                <div
                  key={os.id}
                  className={
                    estourado
                      ? 'relative rounded-xl border-l-4 border-l-danger bg-red-50/60 p-4 shadow-card'
                      : 'relative rounded-xl border-l-4 border-l-brand-600 bg-surface p-4 shadow-card'
                  }
                >
                  {/* A miniatura fica fora do fluxo (absolute) de propósito —
                      ela é bem mais alta que a linha "OS ... · entrada ...", e
                      se entrasse no flex normal dessa linha, a linha inteira
                      cresceria pra caber ela e empurraria todo o resto do card
                      pra baixo, sobrando um vão vazio embaixo do cabeçalho. */}
                  <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <ModeloVeiculoThumb
                      base64={os.veiculoId != null ? imagensPorVeiculoId.get(os.veiculoId) : undefined}
                      size={96}
                    />
                  </div>

                  <p className="pr-28 font-mono text-xs text-ink-muted">
                    OS {os.numero} · entrada {formatDateTime(os.dataAbertura)}
                  </p>

                  <p className="mt-1.5 text-base font-semibold text-ink">{os.veiculoPlaca}</p>
                  <p className="text-sm text-ink-muted">{os.clienteNome}</p>

                  {os.observacoes && (
                    <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
                      <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                        <MessageSquareText size={12} /> Relato do cliente
                      </p>
                      <p className="text-sm text-ink">{os.observacoes}</p>
                    </div>
                  )}

                  {(servicos.length > 0 || pecas.length > 0) && (
                    <div className="mt-2 flex flex-col gap-1 text-sm text-ink">
                      {servicos.map((item, i) => (
                        <p key={`s-${i}`} className="flex items-start gap-1.5">
                          <Wrench size={13} className="mt-0.5 shrink-0 text-ink-muted" />
                          <span>
                            {item.quantidade}× {item.descricao}
                          </span>
                        </p>
                      ))}
                      {pecas.map((item, i) => (
                        <p key={`p-${i}`} className="flex items-start gap-1.5">
                          <Package size={13} className="mt-0.5 shrink-0 text-ink-muted" />
                          <span>
                            {item.quantidade}× {item.descricao}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}

                  {(os.tempoVendidoMinutos || os.tempoConsumidoMinutos) && (
                    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Vendido</p>
                        <p className="font-mono text-sm font-semibold text-ink">
                          {formatMinutosParaHoras(os.tempoVendidoMinutos)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Consumido</p>
                        <p className="font-mono text-sm font-semibold text-ink">
                          {formatMinutosParaHoras(os.tempoConsumidoMinutos)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                          {estourado ? 'Estouro' : 'Restante'}
                        </p>
                        <p className={estourado ? 'font-mono text-sm font-semibold text-danger' : 'font-mono text-sm font-semibold text-success'}>
                          {formatMinutosParaHoras((os.tempoVendidoMinutos ?? 0) - (os.tempoConsumidoMinutos ?? 0))}
                        </p>
                      </div>
                      {estourado && (
                        <span className="ml-auto flex items-center gap-1 text-xs font-medium text-danger">
                          <AlertTriangle size={13} /> Tempo estourado
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    {os.status === 'APROVADA' && (
                      <Button size="sm" fullWidth onClick={() => handleIniciar(os)} loading={timerStart.isPending}>
                        <Play size={14} /> Iniciar
                      </Button>
                    )}
                    {os.status === 'EM_ANDAMENTO' && (
                      <>
                        <Button size="sm" variant="secondary" fullWidth onClick={() => setPausando(os)}>
                          <Pause size={14} /> Pausar
                        </Button>
                        <Button size="sm" fullWidth onClick={() => handleFinalizar(os)} loading={atualizarStatus.isPending}>
                          <CheckCircle2 size={14} /> Finalizar
                        </Button>
                      </>
                    )}
                    {(os.status === 'PAUSADA' || os.status === 'AGUARDANDO_PECA') && (
                      <>
                        <Button size="sm" variant="secondary" fullWidth onClick={() => handleRetomar(os)} loading={timerResume.isPending || atualizarStatus.isPending}>
                          <Play size={14} /> Retomar
                        </Button>
                        <Button size="sm" fullWidth onClick={() => handleFinalizar(os)} loading={atualizarStatus.isPending}>
                          <CheckCircle2 size={14} /> Finalizar
                        </Button>
                      </>
                    )}
                    <button
                      onClick={() => navigate(`/minhas-os/${os.id}`)}
                      className="flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-2 text-sm font-medium text-ink-muted hover:bg-surface-alt"
                    >
                      <ClipboardList size={14} /> Checklist/fotos <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PausarOSModal
        open={!!pausando}
        numero={pausando?.numero}
        motivo={motivoPausa}
        onMotivoChange={setMotivoPausa}
        onClose={() => setPausando(null)}
        onConfirm={handleConfirmarPausa}
        loading={timerPause.isPending}
      />
    </div>
  );
}
