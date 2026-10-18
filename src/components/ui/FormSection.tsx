import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

/** Bloco de um formulário longo: título pequeno em caixa-alta com a ação opcional à direita (ex.: "Adicionar"). */
export function FormSection({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('flex flex-col gap-3', className)}>
      <div className="flex min-h-8 items-center justify-between gap-2 border-b border-border pb-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {Icon && <Icon size={14} className="text-brand-600" aria-hidden="true" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
