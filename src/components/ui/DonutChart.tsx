import { motion } from 'framer-motion';
import clsx from 'clsx';

export type DonutTone = 'brand' | 'success' | 'warning' | 'danger' | 'muted';

// Classes completas (não montadas por template) pra o Tailwind enxergar cada uma no build.
const toneClasses: Record<DonutTone, { stroke: string; dot: string }> = {
  brand: { stroke: 'stroke-brand-500', dot: 'bg-brand-500' },
  success: { stroke: 'stroke-success', dot: 'bg-success' },
  warning: { stroke: 'stroke-warning', dot: 'bg-warning' },
  danger: { stroke: 'stroke-danger', dot: 'bg-danger' },
  muted: { stroke: 'stroke-ink-muted', dot: 'bg-ink-muted' },
};

export interface DonutSegment {
  label: string;
  value: number;
  tone: DonutTone;
  /** Texto da legenda à direita (ex.: "R$ 570,00 · 3"); por padrão, o próprio `value`. */
  display?: string;
}

const RADIUS = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RADIUS;
// Folga entre fatias, só quando há mais de uma — dá o aspecto "segmentado" sem ruído.
const GAP = 2.5;

/**
 * Gráfico de rosca em SVG puro (sem biblioteca) — a legenda escrita ao lado
 * carrega os mesmos números, então a informação nunca depende só de cor.
 */
export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  emptyLabel = 'Sem dados',
  className,
}: {
  segments: DonutSegment[];
  centerValue?: string;
  centerLabel?: string;
  emptyLabel?: string;
  className?: string;
}) {
  const visiveis = segments.filter((s) => s.value > 0);
  const total = visiveis.reduce((acc, s) => acc + s.value, 0);
  const resumo = segments.map((s) => `${s.label}: ${s.display ?? s.value}`).join(', ');

  let acumulado = 0;

  return (
    <div className={clsx('flex flex-col items-center gap-5', className)}>
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 100 100" role="img" aria-label={`Gráfico de rosca. ${resumo}`} className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="9" className="stroke-surface-alt" />
          {total > 0 &&
            visiveis.map((s, i) => {
              const comprimento = (s.value / total) * CIRCUNFERENCIA;
              const gap = visiveis.length > 1 ? GAP : 0;
              const visivel = Math.max(comprimento - gap, 0.5);
              const offset = -acumulado;
              acumulado += comprimento;
              return (
                <motion.circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="9"
                  strokeLinecap="butt"
                  className={toneClasses[s.tone].stroke}
                  strokeDashoffset={offset}
                  initial={{ strokeDasharray: `0 ${CIRCUNFERENCIA}` }}
                  animate={{ strokeDasharray: `${visivel} ${CIRCUNFERENCIA - visivel}` }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeOut' }}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {total > 0 || centerValue ? (
            <>
              <span className="text-xl font-bold leading-tight text-ink">{centerValue ?? total}</span>
              {centerLabel && <span className="mt-0.5 text-xs text-ink-muted">{centerLabel}</span>}
            </>
          ) : (
            <span className="text-xs text-ink-muted">{emptyLabel}</span>
          )}
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', toneClasses[s.tone].dot)} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-ink-muted">{s.label}</span>
            <span className="shrink-0 font-semibold text-ink">{s.display ?? s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
