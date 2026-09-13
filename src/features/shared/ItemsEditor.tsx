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

      {fields.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum item adicionado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                <th className="w-28 px-2 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium">Serviço / Produto</th>
                <th className="w-48 px-2 py-2 font-medium">Descrição</th>
                <th className="w-20 px-2 py-2 font-medium">Qtd.</th>
                <th className="w-28 px-2 py-2 font-medium">Valor un.</th>
                <th className="w-28 px-2 py-2 text-right font-medium">Subtotal</th>
                <th className="w-9 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const tipoItem = watch(`${name}.${index}.tipoItem`);
                const quantidade = Number(watch(`${name}.${index}.quantidade`)) || 0;
                const valorUnitario = Number(watch(`${name}.${index}.valorUnitario`)) || 0;
                return (
                  <tr key={field.id} className="border-b border-border last:border-0">
                    <td className="p-1.5 align-top">
                      <Select {...register(`${name}.${index}.tipoItem`)}>
                        <option value="SERVICO">Serviço</option>
                        <option value="PRODUTO">Produto</option>
                      </Select>
                    </td>

                    <td className="p-1.5 align-top">
                      {tipoItem === 'SERVICO' ? (
                        <Controller
                          control={control}
                          name={`${name}.${index}.servicoId`}
                          render={({ field: f }) => (
                            <Select
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
                    </td>

                    <td className="p-1.5 align-top">
                      <Input {...register(`${name}.${index}.descricao`)} />
                    </td>
                    <td className="p-1.5 align-top">
                      <Input type="number" step="0.01" {...register(`${name}.${index}.quantidade`)} />
                    </td>
                    <td className="p-1.5 align-top">
                      <Input type="number" step="0.01" {...register(`${name}.${index}.valorUnitario`)} />
                    </td>
                    <td className="whitespace-nowrap p-1.5 text-right align-middle font-medium text-ink">
                      {formatCurrency(quantidade * valorUnitario)}
                    </td>
                    <td className="p-1.5 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
                        aria-label="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface-alt">
                <td colSpan={5} className="px-2 py-2.5 text-right text-sm text-ink-muted">
                  Total
                </td>
                <td colSpan={2} className="px-2 py-2.5 text-right text-sm font-semibold text-ink">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
