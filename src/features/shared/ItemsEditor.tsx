import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { useServicos } from '@/hooks/useServicos';
import { useProdutos } from '@/hooks/useProdutos';
import { formatCurrency } from '@/lib/formatters';
import type { ProdutoResponse, ServicoResponse } from '@/api/types';

export interface ItemFormValue {
  tipoItem: 'SERVICO' | 'PRODUTO';
  servicoId?: number;
  produtoId?: number;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export function ItemsEditor({ name }: { name: string }) {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const { data: servicos } = useServicos({ size: 100 });
  const { data: produtos } = useProdutos({ size: 100 });

  const items: ItemFormValue[] = watch(name) ?? [];
  const total = items.reduce((sum, item) => sum + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0), 0);

  function addItem() {
    append({ tipoItem: 'SERVICO', descricao: '', quantidade: 1, valorUnitario: 0 } as ItemFormValue);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Itens</p>
        <Button type="button" size="sm" variant="outline" onClick={addItem}>
          <Plus size={14} /> Adicionar item
        </Button>
      </div>

      {fields.length === 0 && <p className="text-sm text-ink-muted">Nenhum item adicionado ainda.</p>}

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const tipoItem = watch(`${name}.${index}.tipoItem`);
          return (
            <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-2">
                <Select label="Tipo" {...register(`${name}.${index}.tipoItem`)}>
                  <option value="SERVICO">Serviço</option>
                  <option value="PRODUTO">Produto</option>
                </Select>
              </div>

              <div className="sm:col-span-4">
                {tipoItem === 'SERVICO' ? (
                  <Controller
                    control={control}
                    name={`${name}.${index}.servicoId`}
                    render={({ field: f }) => (
                      <Select
                        label="Serviço"
                        value={f.value ?? 0}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          f.onChange(id);
                          const s = servicos?.content?.find((x: ServicoResponse) => x.id === id);
                          if (s) {
                            setValue(`${name}.${index}.descricao`, s.nome);
                            setValue(`${name}.${index}.valorUnitario`, s.preco ?? 0);
                          }
                        }}
                      >
                        <option value={0}>Selecione...</option>
                        {servicos?.content?.map((s: ServicoResponse) => (
                          <option key={s.id} value={s.id}>
                            {s.nome}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                ) : (
                  <Controller
                    control={control}
                    name={`${name}.${index}.produtoId`}
                    render={({ field: f }) => (
                      <Select
                        label="Produto"
                        value={f.value ?? 0}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          f.onChange(id);
                          const p = produtos?.content?.find((x: ProdutoResponse) => x.id === id);
                          if (p) {
                            setValue(`${name}.${index}.descricao`, p.nome);
                            setValue(`${name}.${index}.valorUnitario`, p.precoVenda ?? 0);
                          }
                        }}
                      >
                        <option value={0}>Selecione...</option>
                        {produtos?.content?.map((p: ProdutoResponse) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                )}
              </div>

              <div className="sm:col-span-3">
                <Input label="Descrição" {...register(`${name}.${index}.descricao`)} />
              </div>
              <div className="sm:col-span-1">
                <Input label="Qtd." type="number" step="0.01" {...register(`${name}.${index}.quantidade`)} />
              </div>
              <div className="sm:col-span-1">
                <Input label="Valor un." type="number" step="0.01" {...register(`${name}.${index}.valorUnitario`)} />
              </div>
              <div className="flex justify-end sm:col-span-1">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-md p-2 text-ink-muted hover:bg-red-50 hover:text-danger"
                  aria-label="Remover item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {fields.length > 0 && (
        <div className="flex justify-end border-t border-border pt-3 text-sm">
          <span className="text-ink-muted">Total: </span>
          <span className="ml-1 font-semibold text-ink">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
}
