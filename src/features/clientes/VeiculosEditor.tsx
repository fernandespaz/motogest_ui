import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { ModeloVeiculoField } from '@/features/shared/ModeloVeiculoField';

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
}

export function VeiculosEditor({ name }: { name: string }) {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Veículos</p>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ placa: '' } as VeiculoNovoFormValue)}>
          <Plus size={14} /> Adicionar veículo
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-ink-muted">Nenhum veículo novo adicionado. Use o botão acima para incluir um.</p>
      )}

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Veículo {index + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
                aria-label="Remover veículo"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <Input label="Placa" required {...register(`${name}.${index}.placa`)} />
              </div>
              <Input label="Marca" {...register(`${name}.${index}.marca`)} />
              <Input label="Modelo" {...register(`${name}.${index}.modelo`)} />
              <ModeloVeiculoField
                marca={watch(`${name}.${index}.marca`)}
                modelo={watch(`${name}.${index}.modelo`)}
                onSelecionar={({ marca, modelo }) => {
                  setValue(`${name}.${index}.marca`, marca, { shouldDirty: true });
                  setValue(`${name}.${index}.modelo`, modelo, { shouldDirty: true });
                }}
              />
              <Input label="Cor" {...register(`${name}.${index}.cor`)} />
              <Input label="Ano fabricação" type="number" {...register(`${name}.${index}.anoFabricacao`)} />
              <Input label="Ano modelo" type="number" {...register(`${name}.${index}.anoModelo`)} />
              <Input label="KM atual" type="number" {...register(`${name}.${index}.kmAtual`)} />
              <Input label="Chassi" {...register(`${name}.${index}.chassi`)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
