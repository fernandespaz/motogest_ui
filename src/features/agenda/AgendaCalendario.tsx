import { format, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { Clock, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { AgendaCardBody, cardShell, faixaStatus, horaDe } from './AgendaCard';
import {
  CAPACIDADE_DIA,
  contaCarga,
  dayKey,
  diasDoIntervalo,
  intervaloDaVisao,
  nivelCarga,
  type AgendaItem,
  type AgendaView,
  type CargaNivel,
} from './agendaUtils';

const cargaCor: Record<CargaNivel, string> = {
  vazio: 'bg-transparent',
  baixa: 'bg-green-500',
  media: 'bg-amber-500',
  alta: 'bg-red-500',
};
const cargaLabel: Record<CargaNivel, string> = {
  vazio: 'livre',
  baixa: 'carga baixa',
  media: 'carga média',
  alta: 'carga alta',
};

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Barra de ocupação do dia (qtd / capacidade de referência). */
function BarraCarga({ qtd }: { qtd: number }) {
  const nivel = nivelCarga(qtd);
  return (
    <span
      className="block h-2 w-full overflow-hidden rounded-full bg-surface-alt"
      role="img"
      aria-label={`${qtd} agendamento${qtd === 1 ? '' : 's'}, ${cargaLabel[nivel]}`}
    >
      <span className={clsx('block h-full rounded-full', cargaCor[nivel])} style={{ width: `${Math.min(100, (qtd / CAPACIDADE_DIA) * 100)}%` }} />
    </span>
  );
}

interface Props {
  view: AgendaView;
  cursor: Date;
  porDia: Map<string, AgendaItem[]>;
  onAbrirDia: (d: Date) => void;
  onAbrirAgendamento: (item: AgendaItem) => void;
  onNovo?: (d: Date) => void;
}

export function AgendaCalendario({ view, cursor, porDia, onAbrirDia, onAbrirAgendamento, onNovo }: Props) {
  const { inicio, fim } = intervaloDaVisao(view, cursor);
  const dias = diasDoIntervalo(inicio, fim);

  if (view === 'mes') {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border bg-surface-alt text-center text-xs font-semibold uppercase text-ink-muted">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia) => {
            const lista = porDia.get(dayKey(dia)) ?? [];
            const qtd = contaCarga(lista);
            const foraDoMes = !isSameMonth(dia, cursor);
            return (
              <button
                key={dayKey(dia)}
                type="button"
                onClick={() => onAbrirDia(dia)}
                aria-label={`${format(dia, "d 'de' MMMM", { locale: ptBR })}: ${qtd} agendamento${qtd === 1 ? '' : 's'}`}
                className={clsx(
                  'flex min-h-[5rem] flex-col gap-1.5 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 dark:hover:bg-brand-900/30 sm:min-h-[8.5rem] sm:p-2',
                  foraDoMes && 'bg-surface-alt/50',
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span
                    className={clsx(
                      'flex h-8 min-w-8 items-center justify-center rounded-full text-base font-bold sm:h-9 sm:min-w-9 sm:text-xl',
                      isToday(dia) ? 'bg-brand-600 text-white' : foraDoMes ? 'text-ink-muted' : 'text-ink',
                    )}
                  >
                    {format(dia, 'd')}
                  </span>
                  {qtd > 0 && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 sm:text-sm">
                      {qtd}
                    </span>
                  )}
                </span>
                {qtd > 0 && <BarraCarga qtd={qtd} />}
                {/* Chips só a partir de sm: no celular o número + barra bastam. Todo o quadrado leva à lista do dia. */}
                <span className="hidden flex-col gap-1 sm:flex">
                  {lista.slice(0, 3).map((item) => (
                    <span
                      key={item.ag.id}
                      className={clsx('truncate rounded border-l-2 bg-surface-alt px-1.5 py-0.5 text-xs text-ink', faixaStatus[item.status])}
                      title={`${horaDe(item.ag)} · ${item.ag.veiculoPlaca} · ${item.ag.clienteNome}`}
                    >
                      <span className="font-semibold tabular-nums">{horaDe(item.ag)}</span> {item.ag.veiculoPlaca}
                    </span>
                  ))}
                  {lista.length > 3 && (
                    <span className="text-xs font-medium text-brand-700 dark:text-brand-300">+{lista.length - 3} mais</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <Legenda />
      </div>
    );
  }

  // Semana e dia: colunas de cards ricos. No celular a semana empilha os dias.
  return (
    <div className={clsx('grid gap-3', view === 'semana' ? 'grid-cols-1 md:grid-cols-7' : 'grid-cols-1')}>
      {dias.map((dia) => {
        const lista = porDia.get(dayKey(dia)) ?? [];
        const qtd = contaCarga(lista);
        return (
          <section
            key={dayKey(dia)}
            aria-label={format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}
            className={clsx('flex min-w-0 flex-col gap-2 rounded-xl border bg-surface p-2.5', isToday(dia) ? 'border-brand-400' : 'border-border')}
          >
            <header className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => view === 'semana' && onAbrirDia(dia)} className="text-left">
                  <p className="text-xs font-semibold uppercase text-ink-muted">{format(dia, 'EEE', { locale: ptBR })}</p>
                  <p className="text-sm font-semibold capitalize text-ink">{format(dia, view === 'dia' ? "d 'de' MMMM" : 'd MMM', { locale: ptBR })}</p>
                </button>
                {onNovo && (
                  <button
                    type="button"
                    onClick={() => onNovo(dia)}
                    aria-label={`Novo agendamento em ${format(dia, "d 'de' MMMM", { locale: ptBR })}`}
                    className="rounded-md p-1 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
              <BarraCarga qtd={qtd} />
            </header>
            {lista.length === 0 ? (
              view === 'dia' ? (
                <Card>
                  <EmptyState icon={Clock} title="Nenhum agendamento neste dia" description="Use “Novo agendamento” para criar um." />
                </Card>
              ) : (
                <p className="py-3 text-center text-xs text-ink-muted">Livre</p>
              )
            ) : (
              lista.map((item) => (
                <button key={item.ag.id} type="button" onClick={() => onAbrirAgendamento(item)} className={clsx(cardShell(item.status), 'w-full')}>
                  <AgendaCardBody ag={item.ag} os={item.os} status={item.status} etapa={item.etapa} />
                </button>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-surface-alt px-3 py-2 text-xs text-ink-muted">
      <span className="font-medium">Carga do dia:</span>
      {(['baixa', 'media', 'alta'] as const).map((n) => (
        <span key={n} className="inline-flex items-center gap-1.5">
          <span className={clsx('h-2 w-2 rounded-full', cargaCor[n])} />
          {cargaLabel[n]}
        </span>
      ))}
      <span className="ml-auto">referência: {CAPACIDADE_DIA} serviços/dia</span>
    </div>
  );
}
