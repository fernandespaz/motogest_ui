import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { Select } from '@/components/ui/Field';

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

/** Estado como lista fechada: evita "sp", "S.P." e outras variações digitadas à mão. */
export const UfSelect = forwardRef<HTMLSelectElement, Omit<ComponentPropsWithoutRef<typeof Select>, 'children'>>(
  ({ label = 'UF', ...props }, ref) => (
    <Select ref={ref} label={label} {...props}>
      <option value="">—</option>
      {UFS.map((uf) => (
        <option key={uf} value={uf}>
          {uf}
        </option>
      ))}
    </Select>
  ),
);
UfSelect.displayName = 'UfSelect';
