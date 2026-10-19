import { useFieldArray, useFormContext } from 'react-hook-form';
import { Car, Plus } from 'lucide-react';
import { Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { FormSection } from '@/components/ui/FormSection';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { VeiculoCampos } from '@/features/shared/VeiculoCampos';
import type { CategoriaComplexidade } from '@/api/types';

/** New vehicles to create alongside the client — matches VeiculoDoClienteRequest (no id: these are always creations, never edits of an existing vehicle). */
export interface VeiculoNovoFormValue {
  placa: string;
  marca?: string;
  modelo?: string;
  anoFabricacao?: number;
  anoModelo?: number;
  cor?: string;
  kmAtual?: number;
  chassi?: string;
  observacoes?: string;
  categoria: CategoriaComplexidade;
}

export function VeiculosEditor({ name, titulo = 'Veículos' }: { name: string; titulo?: string }) {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <FormSection
      title={titulo}
      icon={Car}
      action={
        <Button type="button" size="sm" variant="outline" onClick={() => append({ placa: '' } as VeiculoNovoFormValue)}>
          <Plus size={14} /> Adicionar veículo
        </Button>
      }
    >
      {fields.length === 0 && <p className="text-sm text-ink-muted">Nenhum veículo novo adicionado.</p>}

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-border bg-surface-alt/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Veículo {index + 1}
              </span>
              <IconActionButton icon={Trash} label="Remover veículo" tone="danger" onClick={() => remove(index)} />
            </div>
            <VeiculoCampos register={register} watch={watch} setValue={setValue} prefix={`${name}.${index}`} />
          </div>
        ))}
      </div>
    </FormSection>
  );
}
