import { Controller } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import type { InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/Field';
import { onlyDigits } from '@/lib/formatters';

interface MaskedFieldProps<T extends FieldValues>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'value' | 'onChange'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  format: (v: string) => string;
  error?: string;
  hint?: string;
}

/** Input com máscara: o formulário guarda só os dígitos, a tela mostra formatado. */
export function MaskedField<T extends FieldValues>({
  control,
  name,
  label,
  format,
  error,
  hint,
  onBlur,
  ...rest
}: MaskedFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          {...rest}
          label={label}
          error={error}
          hint={hint}
          inputMode="numeric"
          autoComplete="off"
          ref={field.ref}
          name={field.name}
          onBlur={(e) => {
            field.onBlur();
            onBlur?.(e);
          }}
          value={format((field.value as string | undefined) ?? '')}
          onChange={(e) => field.onChange(onlyDigits(e.target.value))}
        />
      )}
    />
  );
}
