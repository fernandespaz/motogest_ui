import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Tab {
  key: string;
  label: string;
  /** Marca a aba com um ponto vermelho — erro de validação dentro dela. */
  invalid?: boolean;
  /** Contador ao lado do rótulo (ex.: contas vencidas). `danger` chama a atenção; `neutral` só informa. */
  badge?: { texto: string; tone?: 'danger' | 'neutral' };
}

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={clsx(
            'relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors',
            active === tab.key ? 'text-brand-700' : 'text-ink-muted hover:text-ink',
          )}
        >
          {tab.label}
          {tab.badge && (
            <span
              className={clsx(
                'ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                tab.badge.tone === 'danger' ? 'bg-danger text-white' : 'bg-surface-alt text-ink-muted',
              )}
            >
              {tab.badge.texto}
            </span>
          )}
          {tab.invalid && (
            <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-danger align-middle" role="img" aria-label="com erro" />
          )}
          {active === tab.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-600" />}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  if (hidden) return null;
  return <>{children}</>;
}
