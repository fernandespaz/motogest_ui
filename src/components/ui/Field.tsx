import { forwardRef } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

const baseControl =
  'w-full rounded-lg border border-border bg-white px-3 text-sm text-ink placeholder:text-ink-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 disabled:bg-surface-alt disabled:text-ink-muted transition-shadow';

// Variante usada em telas com fundo escuro (ex.: login) — o card ali é vidro
// translúcido sobre um fundo escuro, então os controles não podem herdar o
// estilo claro usado no resto do app (admin/formulários sempre em fundo claro).
const baseControlDark =
  'w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 text-sm text-white placeholder:text-slate-400 backdrop-blur-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:bg-white/[0.03] disabled:text-slate-500 transition-shadow';

type FieldVariant = 'light' | 'dark';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  variant?: FieldVariant;
}

export function FieldWrapper({ label, error, hint, required, children, className, variant = 'light' }: FieldWrapperProps) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className={clsx('text-sm font-medium', variant === 'dark' ? 'text-slate-200' : 'text-ink')}>
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className={clsx('text-xs font-medium', variant === 'dark' ? 'text-red-400' : 'text-danger')}>{error}</p>
      ) : hint ? (
        <p className={clsx('text-xs', variant === 'dark' ? 'text-slate-400' : 'text-ink-muted')}>{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  variant?: FieldVariant;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className, icon: Icon, variant = 'light', ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required} variant={variant}>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className={clsx(
              'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2',
              variant === 'dark' ? 'text-slate-400' : 'text-ink-muted',
            )}
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          className={clsx(
            variant === 'dark' ? baseControlDark : baseControl,
            'h-10',
            Icon && 'pl-9',
            error && (variant === 'dark' ? 'border-red-500/60 focus:ring-red-500/40' : 'border-danger focus:ring-danger'),
            className,
          )}
          required={required}
          {...props}
        />
      </div>
    </FieldWrapper>
  ),
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <textarea
        ref={ref}
        className={clsx(baseControl, 'py-2 min-h-[5rem]', error && 'border-danger focus:ring-danger', className)}
        required={required}
        {...props}
      />
    </FieldWrapper>
  ),
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, required, className, children, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <select
        ref={ref}
        className={clsx(baseControl, 'h-10', error && 'border-danger focus:ring-danger', className)}
        required={required}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  ),
);
Select.displayName = 'Select';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, className, ...props }, ref) => (
  <label className="flex items-center gap-2 text-sm text-ink">
    <input
      ref={ref}
      type="checkbox"
      className={clsx(
        'h-4 w-4 rounded border-border text-brand-600 focus:ring-2 focus:ring-brand-400',
        className,
      )}
      {...props}
    />
    {label}
  </label>
));
Checkbox.displayName = 'Checkbox';
