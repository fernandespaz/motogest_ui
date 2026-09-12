import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/** A text input that visibly reads as "search" — a leading magnifier icon plus a
 *  clear button once there's something to clear, instead of a plain text field. */
export function SearchInput({ value, onChange, className, placeholder = 'Buscar...', ...props }: SearchInputProps) {
  return (
    <div className={clsx('relative', className)}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-9 text-sm text-ink placeholder:text-ink-muted transition-shadow focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-muted hover:bg-surface-alt hover:text-ink"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
