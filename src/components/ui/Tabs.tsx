import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Tab {
  key: string;
  label: string;
}

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            'relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors',
            active === tab.key ? 'text-brand-700' : 'text-ink-muted hover:text-ink',
          )}
        >
          {tab.label}
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
