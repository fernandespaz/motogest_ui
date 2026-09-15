import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Pencil, Trash2, Check } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { ModeloVeiculoField, ModeloVeiculoThumb, useModeloVeiculoImagem } from '@/features/shared/ModeloVeiculoField';

/**
 * A row in the client's "Veículos vinculados" list. Purely presentational —
 * it reads/writes `veiculosExistentes.{index}.*` on the SAME form as the rest
 * of the client, so one "Salvar" persists client fields, edited vehicles and
 * new vehicles together (no nested form, no second save button to confuse
 * with the modal's own footer button).
 */
export function VeiculoVinculadoRow({ index, onRemover }: { index: number; onRemover: () => void }) {
  const [editing, setEditing] = useState(false);
  const { control, register, formState, watch, setValue } = useFormContext();
  const veiculo = useWatch({ control, name: `veiculosExistentes.${index}` });
  const rowErrors = (formState.errors as any)?.veiculosExistentes?.[index];
  // Chamado incondicionalmente (regra dos hooks) mesmo que o resultado só
  // seja usado no card de resumo, já que este componente tem "return" cedo
  // demais (linha abaixo, e outro no modo de edição) pra chamar hook depois.
  const imagemResumo = useModeloVeiculoImagem(veiculo?.marca, veiculo?.modelo);

  if (!veiculo) return null;

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-300 bg-brand-50/40 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input label="Placa" required error={rowErrors?.placa?.message} {...register(`veiculosExistentes.${index}.placa`)} />
          <Input label="Marca" {...register(`veiculosExistentes.${index}.marca`)} />
          <Input label="Modelo" error={rowErrors?.modelo?.message} {...register(`veiculosExistentes.${index}.modelo`)} />
          <ModeloVeiculoField
            marca={watch(`veiculosExistentes.${index}.marca`)}
            modelo={watch(`veiculosExistentes.${index}.modelo`)}
            onSelecionar={({ marca, modelo }) => {
              setValue(`veiculosExistentes.${index}.marca`, marca, { shouldDirty: true });
              setValue(`veiculosExistentes.${index}.modelo`, modelo, { shouldDirty: true });
            }}
          />
          <Input label="Cor" error={rowErrors?.cor?.message} {...register(`veiculosExistentes.${index}.cor`)} />
          <Input
            label="Ano fabricação"
            type="number"
            error={rowErrors?.anoFabricacao?.message}
            {...register(`veiculosExistentes.${index}.anoFabricacao`)}
          />
          <Input label="Ano modelo" type="number" {...register(`veiculosExistentes.${index}.anoModelo`)} />
          <Input label="KM atual" type="number" {...register(`veiculosExistentes.${index}.kmAtual`)} />
          <Input label="Chassi" error={rowErrors?.chassi?.message} {...register(`veiculosExistentes.${index}.chassi`)} />
        </div>
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
            <Check size={14} /> Concluir edição
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <ModeloVeiculoThumb base64={imagemResumo} />
          <div>
            <p className="text-sm font-semibold text-ink">{veiculo.placa}</p>
            <p className="text-xs text-ink-muted">{`${veiculo.marca ?? ''} ${veiculo.modelo ?? ''}`.trim() || '—'}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-brand-700"
            aria-label="Editar veículo"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={onRemover}
            className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
            aria-label="Remover veículo"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-4">
        <div>
          <p className="text-ink-muted">Ano fabricação</p>
          <p className="font-medium text-ink">{veiculo.anoFabricacao || '—'}</p>
        </div>
        <div>
          <p className="text-ink-muted">Ano modelo</p>
          <p className="font-medium text-ink">{veiculo.anoModelo || '—'}</p>
        </div>
        <div>
          <p className="text-ink-muted">Cor</p>
          <p className="font-medium text-ink">{veiculo.cor || '—'}</p>
        </div>
        <div>
          <p className="text-ink-muted">KM atual</p>
          <p className="font-medium text-ink">
            {veiculo.kmAtual != null && veiculo.kmAtual !== '' ? Number(veiculo.kmAtual).toLocaleString('pt-BR') : '—'}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-ink-muted">Chassi</p>
          <p className="font-medium text-ink">{veiculo.chassi || '—'}</p>
        </div>
        {veiculo.observacoes && (
          <div className="col-span-4">
            <p className="text-ink-muted">Observações</p>
            <p className="font-medium text-ink">{veiculo.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
