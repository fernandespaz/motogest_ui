import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, Controller } from 'react-hook-form';
import clsx from 'clsx';
import { Plus, Trash2, Percent, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Field';
import { useServicos } from '@/hooks/useServicos';
import { useProdutos } from '@/hooks/useProdutos';
import { useAuthStore } from '@/store/authStore';
import { useDescontosPorOrigem } from '@/hooks/useDescontos';
import { SolicitarDescontoModal } from './SolicitarDescontoModal';
import { ReservarEstoqueModal } from './ReservarEstoqueModal';
import { formatCurrency, formatMinutosParaHoras, parseHorasParaMinutos, maskHorasInput } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import type { OrigemDesconto, ProdutoResponse, ServicoResponse } from '@/api/types';

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
  id?: number;
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
  origem,
  onGarantirOrigem,
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
  // Origem real (Orçamento/OS já salvo) — desconto/reserva pedem um id de
  // referência que só existe depois que o registro foi criado.
  origem?: { tipo: OrigemDesconto; id: number };
  // Pra um Orçamento ainda não salvo (origem undefined): salva um rascunho
  // silenciosamente na primeira vez que o usuário pede desconto ou reserva,
  // em vez de esconder as ações até o clique manual em "Criar rascunho" — ver
  // uso em OrcamentoFormPage. OS nunca passa isso porque já nasce com id (só
  // existe a partir de um orçamento aprovado).
  onGarantirOrigem?: () => Promise<{ tipo: OrigemDesconto; id: number } | undefined>;
}) {
  const { control, register, watch, setValue, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  // Perfis operacionais (ex.: Mecânico) podem não ter SERVICO_READ/ESTOQUE_READ
  // — sem esse gate, o catálogo tentava carregar de qualquer forma e estourava
  // um 403 real toda vez que a tela de OS abria pra esse perfil.
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data: servicos } = useServicos({ size: 100 }, { enabled: hasPermission('SERVICO_READ') });
  const { data: produtos } = useProdutos({ size: 100 }, { enabled: hasPermission('ESTOQUE_READ') });
  // Só quem aprova desconto (Admin) edita o preço direto — qualquer outro
  // perfil precisa passar pelo fluxo de solicitação de desconto (ver
  // SolicitarDescontoModal), que é quem de fato altera o valor após aprovado.
  const podeEditarValor = hasPermission('DESCONTO_APROVAR');
  const podeReservarEstoque = hasPermission('ESTOQUE_RESERVAR');
  const { data: descontos } = useDescontosPorOrigem(origem?.tipo, origem?.id);
  const [itemParaDesconto, setItemParaDesconto] = useState<number | null>(null);
  const [itemParaReserva, setItemParaReserva] = useState<number | null>(null);

  const items: ItemFormValue[] = watch(name) ?? [];
  const total = items.reduce((sum, item) => sum + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0), 0);
  const tempoTotalMinutos = items.reduce((sum, item) => sum + (Number(item.tempoVendidoMinutos) || 0), 0);

  function addItem() {
    append({ tipoItem: 'SERVICO', descricao: '', quantidade: 1, valorUnitario: 0 } as ItemFormValue);
  }

  // Só a solicitação mais recente de cada item importa pra decidir se ainda
  // dá pra pedir outra — uma rejeitada antiga não deve travar um novo pedido.
  function descontoPendente(itemId: number | undefined) {
    if (itemId == null) return undefined;
    const maisRecente = descontos?.content
      ?.filter((d) => d.itemId === itemId)
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
    return maisRecente?.status === 'PENDENTE' ? maisRecente : undefined;
  }

  // Abre o modal de desconto/reserva pro item de `index`. Se o registro (ou
  // esse item especificamente) ainda não existe no backend, tenta salvar
  // primeiro via onGarantirOrigem (auto-save silencioso, só quando nada foi
  // salvo ainda) antes de abrir — os dois modais precisam de um id real de
  // origem e de item pra chamar a API.
  async function agirNoItem(index: number, abrir: (index: number) => void) {
    const idAtual = getValues(`${name}.${index}.id`);
    if (origem && idAtual != null) {
      abrir(index);
      return;
    }
    if (origem && idAtual == null) {
      // Origem já existe, mas esse item específico foi adicionado depois —
      // salvar de novo aqui reescreveria os ids de todos os itens já
      // persistidos (o backend recria os itens a cada PUT), o que quebraria
      // qualquer desconto pendente ligado a um id antigo. Mais seguro pedir
      // um salvamento manual explícito.
      toast.error('Salve as alterações antes de agir neste item.');
      return;
    }
    if (!onGarantirOrigem) return;
    const resolvida = await onGarantirOrigem();
    if (!resolvida) return;
    abrir(index);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink">Itens</p>

      {fields.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum item adicionado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className={clsx('w-full text-left text-sm', mostrarTempoVendido ? 'min-w-[710px]' : 'min-w-[580px]')}>
            <thead>
              <tr className="border-b border-border bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                <th className="w-24 px-2 py-2 font-medium">Tipo</th>
                <th className="w-48 px-2 py-2 font-medium">Serviço / Produto</th>
                <th className="w-16 px-2 py-2 font-medium">Qtd.</th>
                <th className="w-24 px-2 py-2 font-medium">Valor un.</th>
                {mostrarTempoVendido && <th className="w-32 px-2 py-2 font-medium">Tempo vendido</th>}
                <th className="w-24 px-2 py-2 text-right font-medium">Subtotal</th>
                <th className="w-9 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const itemId = watch(`${name}.${index}.id`);
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
                // Desconto/reserva só fazem sentido pra um item que já existe
                // de verdade no backend (id real) dentro de um registro salvo.
                const podeAgirNoItem = !!origem || !!onGarantirOrigem;
                const pendente = descontoPendente(itemId);
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
                            <div className="mt-1 flex items-center gap-2">
                              <p
                                className={clsx(
                                  'text-xs',
                                  estoqueDisponivelInfo === 0 ? 'font-medium text-danger' : 'text-ink-muted',
                                )}
                              >
                                Estoque disponível: {estoqueDisponivelInfo ?? 0}
                              </p>
                              {podeAgirNoItem && podeReservarEstoque && (estoqueDisponivelInfo ?? 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={() => agirNoItem(index, setItemParaReserva)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                                >
                                  <PackagePlus size={12} /> Reservar
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    <td className="p-1.5 align-top">
                      <Input
                        disabled={disabled}
                        type="number"
                        step="1"
                        min="1"
                        max={estoqueMaximo}
                        {...register(`${name}.${index}.quantidade`, {
                          onChange: (e) => {
                            // Quantidade é sempre inteira — nunca fracionada, mesmo
                            // digitando "1.5" ou colando um valor com casas decimais.
                            let valor = Math.trunc(Number(e.target.value)) || 0;
                            if (estoqueMaximo != null) valor = Math.min(valor, estoqueMaximo);
                            setValue(`${name}.${index}.quantidade`, valor);
                          },
                        })}
                      />
                    </td>
                    <td className="p-1.5 align-top">
                      <Input
                        // Só quem aprova desconto (Admin) mexe no preço direto — todo
                        // outro perfil solicita desconto em vez de editar aqui.
                        disabled={disabled || !podeEditarValor}
                        type="number"
                        step="0.01"
                        {...register(`${name}.${index}.valorUnitario`)}
                      />
                      {!podeEditarValor && podeAgirNoItem && (
                        <div className="mt-1">
                          {pendente ? (
                            <Badge tone="warning">Desconto pendente</Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={() => agirNoItem(index, setItemParaDesconto)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                            >
                              <Percent size={12} /> Solicitar desconto
                            </button>
                          )}
                        </div>
                      )}
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
                <td colSpan={4} className="px-2 py-2.5 text-right text-sm text-ink-muted">
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

      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={addItem} disabled={disabled}>
          <Plus size={14} /> Adicionar item
        </Button>
      </div>

      {origem && itemParaDesconto != null && items[itemParaDesconto] && (
        <SolicitarDescontoModal
          open
          onClose={() => setItemParaDesconto(null)}
          origemTipo={origem.tipo}
          origemId={origem.id}
          itemId={items[itemParaDesconto].id!}
          itemDescricao={items[itemParaDesconto].descricao}
          valorUnitarioAtual={Number(items[itemParaDesconto].valorUnitario) || 0}
        />
      )}

      {origem && itemParaReserva != null && items[itemParaReserva] && (
        <ReservarEstoqueModal
          open
          onClose={() => setItemParaReserva(null)}
          referenciaTipo={origem.tipo}
          referenciaId={origem.id}
          produtoId={items[itemParaReserva].produtoId!}
          produtoNome={items[itemParaReserva].descricao}
          quantidadeSugerida={Number(items[itemParaReserva].quantidade) || 1}
          estoqueDisponivel={
            produtos?.content?.find((p: ProdutoResponse) => p.id === items[itemParaReserva!].produtoId)
              ?.quantidadeDisponivel ?? 0
          }
        />
      )}
    </div>
  );
}
