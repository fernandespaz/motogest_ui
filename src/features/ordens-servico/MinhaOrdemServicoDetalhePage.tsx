import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquareText,
  Wrench,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import {
  useOrdemServico,
  useTimerStartOS,
  useTimerPauseOS,
  useTimerResumeOS,
  useAtualizarStatusOS,
} from '@/hooks/useOrdensServico';
import { useAuthStore } from '@/store/authStore';
import { ChecklistTab } from './ChecklistTab';
import { FotosTab } from './FotosTab';
import { PausarOSModal } from './PausarOSModal';
import { OSItemsSummary } from './OSItemsSummary';
import { formatMinutosParaHoras, formatDateTime } from '@/lib/formatters';
import { ordemServicoStatusMeta, metaFor } from '@/lib/statusMeta';
import { toast } from '@/store/toastStore';
import { extractErrorMessage } from '@/api/client';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/**
 * Tela operacional do técnico pra UMA OS — deliberadamente separada de
 * OrdemServicoFormPage (usada por Consultor/Admin em /ordens-servico/:id).
 * Só mostra dados (cliente, veículo, itens, valores) como texto — nenhum
 * campo é editável aqui, então não existe caminho pelo qual uma ação do
 * Mecânico nessa tela altere o que o Consultor vê. Ações permitidas: rodar o
 * cronômetro (iniciar/pausar/retomar/finalizar) e registrar checklist/fotos —
 * o mesmo trabalho técnico que ele já fazia antes, sem acesso aos dados
 * comerciais da OS.
 */
export function MinhaOrdemServicoDetalhePage() {
  const { id } = useParams();
  const osId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const usuarioLogadoId = useAuthStore((s) => s.usuarioId);
  const [tab, setTab] = useState('checklists');
  const [pausando, setPausando] = useState(false);
  const [motivoPausa, setMotivoPausa] = useState('');

  const { data: os, isLoading } = useOrdemServico(osId);
  const timerStart = useTimerStartOS();
  const timerPause = useTimerPauseOS();
  const timerResume = useTimerResumeOS();
  const atualizarStatus = useAtualizarStatusOS();

  async function handleIniciar() {
    if (!osId) return;
    try {
      await timerStart.mutateAsync(osId);
      toast.success('Cronômetro iniciado.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível iniciar a OS.'));
    }
  }

  async function handleRetomar() {
    if (!osId) return;
    try {
      if (os?.status === 'AGUARDANDO_PECA') {
        await atualizarStatus.mutateAsync({ id: osId, status: 'EM_ANDAMENTO' });
      } else {
        await timerResume.mutateAsync(osId);
      }
      toast.success('OS retomada.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível retomar a OS.'));
    }
  }

  async function handleFinalizar() {
    if (!osId) return;
    try {
      await atualizarStatus.mutateAsync({ id: osId, status: 'CONCLUIDA' });
      toast.success('OS concluída.');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível concluir a OS.'));
    }
  }

  async function handleConfirmarPausa() {
    if (!osId || !motivoPausa.trim()) return;
    try {
      await timerPause.mutateAsync({ id: osId, motivo: motivoPausa.trim() });
      toast.success('OS pausada.');
      setPausando(false);
      setMotivoPausa('');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Não foi possível pausar a OS.'));
    }
  }

  if (isLoading || !os) {
    return (
      <div className="-m-4 flex min-h-screen items-center justify-center bg-surface-alt sm:-m-6">
        <PageSpinner />
      </div>
    );
  }

  const meta = metaFor(ordemServicoStatusMeta, os.status);
  const estourado = !!os.tempoEstourado;
  const temCronometro = !!(os.tempoVendidoMinutos || os.tempoConsumidoMinutos || os.pausas?.length);
  const podeIniciar =
    os.status === 'APROVADA' && (os.usuarioResponsavelId == null || os.usuarioResponsavelId === usuarioLogadoId);
  const podePausar = os.status === 'EM_ANDAMENTO';
  const podeRetomar = os.status === 'PAUSADA' || os.status === 'AGUARDANDO_PECA';
  const podeFinalizar = podePausar || podeRetomar;
  const servicos = (os.itens ?? []).filter((i) => i.tipoItem === 'SERVICO');
  const pecas = (os.itens ?? []).filter((i) => i.tipoItem === 'PRODUTO');

  return (
    <div className="-m-4 min-h-screen bg-surface-alt sm:-m-6">
      <div className="flex items-center gap-3 bg-graphite px-4 py-4 text-white sm:px-6">
        <button
          onClick={() => navigate('/minhas-os')}
          aria-label="Voltar"
          className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold">OS {os.numero ?? `#${os.id}`}</p>
          <p className="truncate text-sm text-slate-400">
            {os.veiculoPlaca} · {os.clienteNome}
          </p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <ThemeToggle variant="dark" />
      </div>

      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
        {os.observacoes && (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
              <MessageSquareText size={14} /> Relato do cliente
            </p>
            <p className="text-sm text-ink">{os.observacoes}</p>
          </div>
        )}

        {temCronometro && (
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Vendido</p>
                    <p className="font-mono text-base font-semibold text-ink">
                      {formatMinutosParaHoras(os.tempoVendidoMinutos)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Consumido</p>
                    <p className="font-mono text-base font-semibold text-ink">
                      {formatMinutosParaHoras(os.tempoConsumidoMinutos)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                      {estourado ? 'Estouro' : 'Restante'}
                    </p>
                    <p
                      className={
                        estourado
                          ? 'font-mono text-base font-semibold text-danger'
                          : 'font-mono text-base font-semibold text-success'
                      }
                    >
                      {formatMinutosParaHoras((os.tempoVendidoMinutos ?? 0) - (os.tempoConsumidoMinutos ?? 0))}
                    </p>
                  </div>
                </div>
                {estourado && (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-danger">
                    <AlertTriangle size={15} /> Tempo estourado
                  </span>
                )}
              </div>
              {os.pausas && os.pausas.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <Clock size={13} /> Histórico de pausas
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {os.pausas.map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-ink">{p.motivo}</span>
                        <span className="text-ink-muted">
                          {formatDateTime(p.inicio)} {p.fim ? `→ ${formatDateTime(p.fim)}` : '(em andamento)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {(podeIniciar || podePausar || podeRetomar) && (
          <div className="flex gap-2">
            {podeIniciar && (
              <Button fullWidth onClick={handleIniciar} loading={timerStart.isPending}>
                <PlayCircle size={16} /> Iniciar
              </Button>
            )}
            {podePausar && (
              <Button variant="secondary" fullWidth onClick={() => setPausando(true)}>
                <Pause size={16} /> Pausar
              </Button>
            )}
            {podeRetomar && (
              <Button
                variant="secondary"
                fullWidth
                onClick={handleRetomar}
                loading={timerResume.isPending || atualizarStatus.isPending}
              >
                <Play size={16} /> Retomar
              </Button>
            )}
            {podeFinalizar && (
              <Button fullWidth onClick={handleFinalizar} loading={atualizarStatus.isPending}>
                <CheckCircle2 size={16} /> Finalizar
              </Button>
            )}
          </div>
        )}

        <OSItemsSummary title="Serviços" icon={Wrench} itens={servicos} />
        <OSItemsSummary title="Peças e produtos" icon={Package} itens={pecas} />

        <Card>
          <CardBody>
            <p className="mb-3 text-sm font-semibold text-ink">Dados da OS</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-muted">Cliente</p>
                <p className="font-medium text-ink">{os.clienteNome ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Veículo</p>
                <p className="font-medium text-ink">{os.veiculoPlaca ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Técnico resp.</p>
                <p className="font-medium text-ink">{os.usuarioResponsavelNome ?? 'Não definido'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">KM de entrada</p>
                <p className="font-medium text-ink">{os.kmEntrada != null ? `${os.kmEntrada} km` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Entrada</p>
                <p className="font-medium text-ink">{formatDateTime(os.dataAbertura)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Previsão</p>
                <p className="font-medium text-ink">{formatDateTime(os.dataPrevisao)}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div>
          <Tabs
            tabs={[
              { key: 'checklists', label: 'Checklists' },
              { key: 'fotos', label: 'Fotos' },
            ]}
            active={tab}
            onChange={setTab}
          />
          <TabPanel hidden={tab !== 'checklists'}>
            <ChecklistTab ordemServicoId={osId!} />
          </TabPanel>
          <TabPanel hidden={tab !== 'fotos'}>
            <FotosTab ordemServicoId={osId!} />
          </TabPanel>
        </div>
      </div>

      <PausarOSModal
        open={pausando}
        numero={os.numero}
        motivo={motivoPausa}
        onMotivoChange={setMotivoPausa}
        onClose={() => setPausando(false)}
        onConfirm={handleConfirmarPausa}
        loading={timerPause.isPending}
      />
    </div>
  );
}
