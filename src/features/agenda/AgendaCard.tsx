import { format } from 'date-fns';
import clsx from 'clsx';
import { Car, FileText, User, Wrench, HardHat } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { AgendamentoResponse, OrdemServicoResponse } from '@/api/types';
import { agendamentoStatusMeta, metaFor } from '@/lib/statusMeta';
import { ETAPA_LABEL, type Etapa } from './agendaUtils';

export function horaDe(ag: AgendamentoResponse): string {
  return ag.dataHora ? format(new Date(ag.dataHora), 'HH:mm') : '--:--';
}

export function servicosTexto(ag: AgendamentoResponse): string {
  return ag.servicos?.map((s) => s.nome).join(', ') || 'Sem serviços definidos';
}

/** Faixa lateral por status efetivo — mesma linguagem de cor do Badge, legível também em chip pequeno. */
export const faixaStatus: Record<string, string> = {
  AGENDADO: 'border-l-brand-500',
  CONFIRMADO: 'border-l-brand-700',
  NA_FILA: 'border-l-sky-500',
  EM_ANDAMENTO: 'border-l-amber-500',
  AGUARDANDO_PECAS: 'border-l-orange-500',
  CONCLUIDO: 'border-l-green-500',
  CANCELADO: 'border-l-red-400 opacity-60',
};

/** Card rico (placa, cliente, serviço, mecânico, horário) — usado nas visões semana/dia e no Kanban. */
export function AgendaCardBody({
  ag,
  os,
  status,
  etapa,
  mostrarStatus = true,
}: {
  ag?: AgendamentoResponse;
  os?: OrdemServicoResponse;
  /** Status efetivo (OS do técnico quando existe) — não o status cru do agendamento. */
  status?: string;
  /** Onde está no caminho orçamento → OS; só aparece enquanto o técnico ainda não iniciou. */
  etapa?: Etapa;
  mostrarStatus?: boolean;
}) {
  const meta = metaFor(agendamentoStatusMeta, status ?? ag?.status);
  const placa = ag?.veiculoPlaca ?? os?.veiculoPlaca;
  const cliente = ag?.clienteNome ?? os?.clienteNome;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-left">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <Car size={14} className="text-brand-600" aria-hidden />
          <span className="tracking-wide">{placa ?? '—'}</span>
        </span>
        {ag ? (
          <span className="text-xs font-semibold tabular-nums text-brand-700 dark:text-brand-300">{horaDe(ag)}</span>
        ) : (
          <Badge tone="warning">{os?.numero ?? 'OS'}</Badge>
        )}
      </div>
      {cliente && (
        <p className="flex items-center gap-1.5 truncate text-sm text-ink">
          <User size={13} className="shrink-0 text-ink-muted" aria-hidden />
          <span className="truncate">{cliente}</span>
        </p>
      )}
      {ag && (
        <p className="flex items-start gap-1.5 text-xs text-ink-muted">
          <Wrench size={13} className="mt-px shrink-0" aria-hidden />
          <span className="line-clamp-2">{servicosTexto(ag)}</span>
        </p>
      )}
      {etapa && etapa !== 'COM_OS' && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          <FileText size={13} className="shrink-0" aria-hidden />
          <span className="truncate">{ETAPA_LABEL[etapa]}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
          <HardHat size={13} className="shrink-0" aria-hidden />
          <span className="truncate">{os?.usuarioResponsavelNome ?? 'Sem mecânico definido'}</span>
        </p>
        {mostrarStatus && <Badge tone={meta.tone}>{meta.label}</Badge>}
      </div>
    </div>
  );
}

export function cardShell(status?: string) {
  return clsx(
    'rounded-lg border border-border border-l-4 bg-surface p-3 shadow-sm transition-shadow hover:shadow-md',
    faixaStatus[status ?? ''] ?? 'border-l-border',
  );
}
