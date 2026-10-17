import type { ReactNode } from 'react';
import clsx from 'clsx';

// Grade de 12 colunas a partir de `sm`; no celular tudo empilha. As classes
// precisam aparecer por extenso pro Tailwind enxergá-las — nada de montar a
// string com template.
const SPAN = {
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  5: 'sm:col-span-5',
  6: 'sm:col-span-6',
  8: 'sm:col-span-8',
  9: 'sm:col-span-9',
  12: 'sm:col-span-12',
} as const;

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-12">{children}</div>;
}

export function Col({
  span,
  className,
  children,
}: {
  span: keyof typeof SPAN;
  className?: string;
  children: ReactNode;
}) {
  return <div className={clsx(SPAN[span], className)}>{children}</div>;
}

/** Bloco com título: agrupa campos do mesmo assunto, separados do bloco seguinte por uma linha. */
export function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-5 last:border-b-0 last:pb-0">
      <div>
        <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
        {descricao && <p className="text-xs text-ink-muted">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}
