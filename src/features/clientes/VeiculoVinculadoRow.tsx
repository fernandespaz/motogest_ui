import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Check } from 'lucide-react';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { ModeloVeiculoThumb, useModeloVeiculoImagem } from '@/features/shared/ModeloVeiculoField';
import { VeiculoCampos } from '@/features/shared/VeiculoCampos';
import { TOM_CATEGORIA_COMPLEXIDADE } from '@/lib/categoria';

/**
 * A row in the client's "Veículos vinculados" list. Purely presentational —
 * it reads/writes `veiculosExistentes.{index}.*` on the SAME form as the rest
 * of the client, so one "Salvar" persists client fields, edited vehicles and
 * new vehicles together (no nested form, no second save button to confuse
 * with the modal's own footer button).
 */
export function VeiculoVinculadoRow({ index, onRemover }: { index: number; onRemover: () => void }) {
  const [editing, setEditing] = useState(false);
  const { control, register, formState, setValue, watch } = useFormContext();
  const veiculo = useWatch({ control, name: `veiculosExistentes.${index}` });
  const rowErrors = (formState.errors as any)?.veiculosExistentes?.[index];
  // Chamado incondicionalmente (regra dos hooks) mesmo que o resultado só
  // seja usado no card de resumo, já que este componente tem "return" cedo
  // demais (linha abaixo, e outro no modo de edição) pra chamar hook depois.
  const imagemResumo = useModeloVeiculoImagem(veiculo?.marca, veiculo?.modelo);

  if (!veiculo) return null;

  if (editing) {
    return (
      <div className="rounded-xl border border-brand-300 bg-brand-50/40 p-3 dark:border-brand-700 dark:bg-brand-900/20 md:col-span-2">
        <VeiculoCampos
          register={register}
          watch={watch}
          setValue={setValue}
          prefix={`veiculosExistentes.${index}`}
          errors={rowErrors}
          categoriaVazia
        />
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(false)}>
            <Check size={14} /> Concluir edição
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-alt/40 p-3">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <ModeloVeiculoThumb base64={imagemResumo} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-ink">{veiculo.placa}</p>
              {veiculo.categoria ? (
                <Badge tone={TOM_CATEGORIA_COMPLEXIDADE[veiculo.categoria as 'A' | 'B' | 'C']}>{veiculo.categoria}</Badge>
              ) : (
                // Veículo cadastrado antes desta feature (categoria virou
                // obrigatória no backend) — precisa ser classificado antes de
                // salvar; sem esse aviso no resumo, um "Salvar" bloqueado por
                // essa linha (colapsada, sem erro visível) parecia não fazer
                // nada.
                <Badge tone="warning">Sem categoria</Badge>
              )}
            </div>
            <p className="text-xs text-ink-muted">{`${veiculo.marca ?? ''} ${veiculo.modelo ?? ''}`.trim() || '—'}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <IconActionButton icon={PencilSimple} label="Editar veículo" tone="brand" onClick={() => setEditing(true)} />
          <IconActionButton icon={Trash} label="Remover veículo" tone="danger" onClick={onRemover} />
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
