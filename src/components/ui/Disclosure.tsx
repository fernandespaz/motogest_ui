import { useId, type ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import clsx from 'clsx';

/**
 * Seção recolhível. O conteúdo só é montado enquanto aberto: serve também pra adiar o custo de
 * blocos pesados (ex.: o canvas 3D da vistoria) até o usuário pedir.
 * Controlado — quem usa decide quando abrir (ex.: abrir sozinho se já há dados dentro).
 */
export function Disclosure({
  title,
  summary,
  open,
  onOpenChange,
  children,
}: {
  title: ReactNode;
  /** Resumo curto mostrado com a seção fechada (ex.: "2 avarias"). */
  summary?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const painelId = useId();
  return (
    <section className="rounded-xl border border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={painelId}
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-surface-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="flex items-center gap-2 text-xs text-ink-muted">
          {summary}
          <CaretDown size={14} aria-hidden="true" className={clsx('transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && (
        <div id={painelId} className="border-t border-border p-4">
          {children}
        </div>
      )}
    </section>
  );
}
