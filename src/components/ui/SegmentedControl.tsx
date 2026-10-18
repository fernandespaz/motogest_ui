import { useId } from 'react';
import clsx from 'clsx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Escolha exclusiva entre poucas opções visíveis de uma vez (ex.: Pessoa física | Pessoa jurídica) — mais rápido que um select. */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  required?: boolean;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span id={labelId} className="text-sm font-medium text-ink">
          {label} {required && <span className="text-danger">*</span>}
        </span>
      )}
      <div
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-border bg-surface-alt p-1"
      >
        {options.map((o) => {
          const ativo = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onChange(o.value)}
              className={clsx(
                'h-8 rounded-md px-3 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                ativo ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-muted hover:text-ink',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
