import { forwardRef } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

const baseControl =
  'w-full rounded-lg border border-border bg-white px-3 text-sm text-ink placeholder:text-ink-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 disabled:bg-surface-alt disabled:text-ink-muted transition-shadow';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldWrapper({ label, error, hint, required, children, className }: FieldWrapperProps) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-ink">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <input
        ref={ref}
        className={clsx(baseControl, 'h-10', error && 'border-danger focus:ring-danger', className)}
        required={required}
        {...props}
      />
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
