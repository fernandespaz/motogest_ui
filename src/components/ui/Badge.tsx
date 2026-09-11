import type { ReactNode } from 'react';
import clsx from 'clsx';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-100 text-brand-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        toneStyles[tone],
      )}
    >
      {children}
    </span>
  );
}
