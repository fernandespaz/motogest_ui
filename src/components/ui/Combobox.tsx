import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { FieldWrapper } from './Field';

export interface ComboboxOption {
  value: number;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  value: number | undefined;
  onChange: (value: number) => void;
  options: ComboboxOption[];
  query: string;
  onQueryChange: (query: string) => void;
  loading?: boolean;
  emptyLabel?: string;
}

/**
 * A select whose search box lives inside the control itself (type to filter,
 * pick from the list below) instead of a separate free-text input floating
 * above a plain <select> — that older two-piece layout is what looked
 * misaligned and confusing about "how do I search" on the Orçamento form.
 */
export function Combobox({
  label,
  required,
  error,
  disabled,
  placeholder = 'Buscar...',
  value,
  onChange,
  options,
  query,
  onQueryChange,
  loading,
  emptyLabel = 'Nenhum resultado encontrado.',
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function selectOption(option: ComboboxOption) {
    onChange(option.value);
    onQueryChange('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[highlight]) selectOption(options[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <FieldWrapper label={label} error={error} required={required}>
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            disabled={disabled}
            value={open ? query : selected?.label ?? ''}
            onFocus={() => {
              setOpen(true);
              onQueryChange('');
            }}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selected && !open ? selected.label : placeholder}
            className={clsx(
              'h-10 w-full rounded-lg border bg-white pl-9 pr-16 text-sm text-ink placeholder:text-ink-muted transition-shadow',
              'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 disabled:bg-surface-alt disabled:text-ink-muted',
              error ? 'border-danger focus:ring-danger' : 'border-border',
            )}
          />
          <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {loading && <Loader2 size={14} className="animate-spin text-ink-muted" />}
            {selected && !open && !disabled && (
              <button
                type="button"
                onClick={() => {
                  onChange(0);
                  onQueryChange('');
                }}
                aria-label="Limpar seleção"
                className="rounded-full p-0.5 text-ink-muted hover:bg-surface-alt hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
            <ChevronDown size={14} className="text-ink-muted" />
          </div>
        </div>

        {open && !disabled && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg">
            {options.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-muted">{loading ? 'Buscando...' : emptyLabel}</p>
            ) : (
              options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(option)}
                  className={clsx(
                    'flex w-full flex-col items-start px-3 py-2 text-left text-sm',
                    index === highlight ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-surface-alt',
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.sublabel && <span className="text-xs text-ink-muted">{option.sublabel}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}
