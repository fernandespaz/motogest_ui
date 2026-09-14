import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import clsx from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { useServicos } from '@/hooks/useServicos';
import { useProdutos } from '@/hooks/useProdutos';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatMinutosParaHoras, parseHorasParaMinutos, maskHorasInput } from '@/lib/formatters';
import type { ProdutoResponse, ServicoResponse } from '@/api/types';

const PRESETS_TEMPO = [
  { label: '0:30', minutos: 30 },
  { label: '1:00', minutos: 60 },
  { label: '2:00', minutos: 120 },
];

function TempoVendidoInput({
  value,
  onChange,
  disabled,
}: {
  value: number | undefined;
  onChange: (minutos: number | undefined) => void;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState(value != null ? formatMinutosParaHoras(value) : '');

  // Mantém o texto exibido em sincronia quando o valor muda por fora (preset,
  // reset do formulário ao carregar um orçamento existente etc.).
  useEffect(() => {
    setTexto(value != null ? formatMinutosParaHoras(value) : '');
  }, [value]);

  function confirmar(bruto: string) {
    const minutos = parseHorasParaMinutos(bruto);
    onChange(minutos);
    setTexto(minutos != null ? formatMinutosParaHoras(minutos) : '');
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        disabled={disabled}
        value={texto}
        placeholder="00:00"
        inputMode="numeric"
        onChange={(e) => setTexto(maskHorasInput(e.target.value))}
        onBlur={(e) => confirmar(e.target.value)}
      />
      <div className="flex gap-1">
        {PRESETS_TEMPO.map((preset) => (
          <button
            key={preset.minutos}
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(preset.minutos);
              setTexto(preset.label);
            }}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-ink-muted hover:bg-surface-alt hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface ItemFormValue {
  tipoItem: 'SERVICO' | 'PRODUTO';
  servicoId?: number;
  produtoId?: number;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  tempoVendidoMinutos?: number;
}

export function ItemsEditor({
  name,
  mostrarTempoVendido,
  disabled,
  limitarQuantidadeAoEstoque,
}: {
  name: string;
  mostrarTempoVendido?: boolean;
  disabled?: boolean;
  // Trava a quantidade de um item PRODUTO no estoque disponível — faz sentido
  // pra Ordem de Serviço (que consome estoque de verdade), mas não pra
  // Orçamento (uma estimativa: o consultor pode cotar mais do que há em
  // estoque hoje, contando com reposição antes do serviço começar). Por isso
  // é opt-in, não o padrão.
  limitarQuantidadeAoEstoque?: boolean;
}) {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  // Perfis operacionais (ex.: Mecânico) podem não ter SERVICO_READ/ESTOQUE_READ
  // — sem esse gate, o catálogo tentava carregar de qualquer forma e estourava
  // um 403 real toda vez que a tela de OS abria pra esse perfil.
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data: servicos } = useServicos({ size: 100 }, { enabled: hasPermission('SERVICO_READ') });
  const { data: produtos } = useProdutos({ size: 100 }, { enabled: hasPermission('ESTOQUE_READ') });

  const items: ItemFormValue[] = watch(name) ?? [];
  const total = items.reduce((sum, item) => sum + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0), 0);
  const tempoTotalMinutos = items.reduce((sum, item) => sum + (Number(item.tempoVendidoMinutos) || 0), 0);

  function addItem() {
    append({ tipoItem: 'SERVICO', descricao: '', quantidade: 1, valorUnitario: 0 } as ItemFormValue);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Itens</p>
        <Button type="button" size="sm" variant="outline" onClick={addItem} disabled={disabled}>
          <Plus size={14} /> Adicionar item
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum item adicionado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className={clsx('w-full text-left text-sm', mostrarTempoVendido ? 'min-w-[880px]' : 'min-w-[720px]')}>
            <thead>
              <tr className="border-b border-border bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                <th className="w-28 px-2 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium">Serviço / Produto</th>
                <th className="w-48 px-2 py-2 font-medium">Descrição</th>
                <th className="w-20 px-2 py-2 font-medium">Qtd.</th>
                <th className="w-28 px-2 py-2 font-medium">Valor un.</th>
                {mostrarTempoVendido && <th className="w-32 px-2 py-2 font-medium">Tempo vendido</th>}
                <th className="w-28 px-2 py-2 text-right font-medium">Subtotal</th>
                <th className="w-9 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const tipoItem = watch(`${name}.${index}.tipoItem`);
                const quantidade = Number(watch(`${name}.${index}.quantidade`)) || 0;
                const valorUnitario = Number(watch(`${name}.${index}.valorUnitario`)) || 0;
                const produtoIdSelecionado = watch(`${name}.${index}.produtoId`);
                const produtoSelecionado =
                  tipoItem === 'PRODUTO'
                    ? produtos?.content?.find((p: ProdutoResponse) => p.id === produtoIdSelecionado)
                    : undefined;
                // undefined enquanto nenhum produto foi escolhido — só vira um
                // teto de verdade (inclusive 0, produto sem estoque) depois da
                // seleção, pra não travar o campo de quantidade de um Serviço.
                // Sempre calculado (pro aviso "Estoque disponível" abaixo do
                // select), mas só vira um limite de fato quando
                // limitarQuantidadeAoEstoque estiver ligado.
                const estoqueDisponivelInfo = produtoSelecionado?.quantidadeDisponivel;
                const estoqueMaximo = limitarQuantidadeAoEstoque ? estoqueDisponivelInfo : undefined;
                return (
                  <tr key={field.id} className="border-b border-border last:border-0">
                    <td className="p-1.5 align-top">
                      <Select disabled={disabled} {...register(`${name}.${index}.tipoItem`)}>
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
                              disabled={disabled}
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
                        <>
                          <Controller
                            control={control}
                            name={`${name}.${index}.produtoId`}
                            render={({ field: f }) => (
                              <Select
                                disabled={disabled}
                                value={f.value ?? 0}
                                onChange={(e) => {
                                  const id = Number(e.target.value);
                                  f.onChange(id);
                                  const p = produtos?.content?.find((x: ProdutoResponse) => x.id === id);
                                  if (p) {
                                    setValue(`${name}.${index}.descricao`, p.nome);
                                    setValue(`${name}.${index}.valorUnitario`, p.precoVenda ?? 0);
                                    // O produto pode ter menos em estoque do que já estava
                                    // digitado (ou do que o item anterior selecionado tinha).
                                    const disponivelDoNovo = p.quantidadeDisponivel;
                                    if (limitarQuantidadeAoEstoque && disponivelDoNovo != null && quantidade > disponivelDoNovo) {
                                      setValue(`${name}.${index}.quantidade`, disponivelDoNovo);
                                    }
                                  }
                                }}
                              >
                                <option value={0}>Selecione...</option>
                                {produtos?.content?.map((p: ProdutoResponse) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome} ({p.quantidadeDisponivel ?? 0} disp.)
                                  </option>
                                ))}
                              </Select>
                            )}
                          />
                          {produtoSelecionado && (
                            <p
                              className={clsx(
                                'mt-1 text-xs',
                                estoqueDisponivelInfo === 0 ? 'font-medium text-danger' : 'text-ink-muted',
                              )}
                            >
                              Estoque disponível: {estoqueDisponivelInfo ?? 0}
                            </p>
                          )}
                        </>
                      )}
                    </td>

                    <td className="p-1.5 align-top">
                      <Input disabled={disabled} {...register(`${name}.${index}.descricao`)} />
                    </td>
                    <td className="p-1.5 align-top">
                      <Input
                        disabled={disabled}
                        type="number"
                        step="0.01"
                        max={estoqueMaximo}
                        {...register(`${name}.${index}.quantidade`, {
                          onChange: (e) => {
                            if (estoqueMaximo == null) return;
                            const valor = Number(e.target.value);
                            if (valor > estoqueMaximo) setValue(`${name}.${index}.quantidade`, estoqueMaximo);
                          },
                        })}
                      />
                    </td>
                    <td className="p-1.5 align-top">
                      <Input
                        disabled={disabled}
                        type="number"
                        step="0.01"
                        {...register(`${name}.${index}.valorUnitario`)}
                      />
                    </td>
                    {mostrarTempoVendido && (
                      <td className="p-1.5 align-top">
                        <Controller
                          control={control}
                          name={`${name}.${index}.tempoVendidoMinutos`}
                          render={({ field: f }) => (
                            <TempoVendidoInput value={f.value} onChange={f.onChange} disabled={disabled} />
                          )}
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap p-1.5 text-right align-middle font-medium text-ink">
                      {formatCurrency(quantidade * valorUnitario)}
                    </td>
                    <td className="p-1.5 text-center align-middle">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => remove(index)}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger disabled:pointer-events-none disabled:opacity-40"
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
                {mostrarTempoVendido && (
                  <td className="px-2 py-2.5 text-sm font-semibold text-ink">
                    {formatMinutosParaHoras(tempoTotalMinutos)}
                  </td>
                )}
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
