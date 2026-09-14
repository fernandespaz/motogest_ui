import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Trash2, Percent, PackagePlus, Wrench, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Field';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { useServicos } from '@/hooks/useServicos';
import { useProdutos } from '@/hooks/useProdutos';
import { useAuthStore } from '@/store/authStore';
import { useDescontosPorOrigem } from '@/hooks/useDescontos';
import { SolicitarDescontoModal } from './SolicitarDescontoModal';
import { ReservarEstoqueModal } from './ReservarEstoqueModal';
import { formatCurrency, formatMinutosParaHoras, parseHorasParaMinutos, maskHorasInput } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import type { OrigemDesconto, ProdutoResponse, ServicoResponse } from '@/api/types';

// Incrementam o tempo já digitado em vez de substituí-lo — clicar "+1:00" duas
// vezes soma 2h, não trava em 1h — por isso o rótulo tem o "+" explícito.
const PRESETS_TEMPO = [
  { label: '+0:30', minutos: 30 },
  { label: '+1:00', minutos: 60 },
  { label: '+2:00', minutos: 120 },
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

  function incrementar(minutosAAdicionar: number) {
    const novoValor = (value ?? 0) + minutosAAdicionar;
    onChange(novoValor);
    setTexto(formatMinutosParaHoras(novoValor));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Ver comentário equivalente em renderLinha: contêiner de largura fixa
          pra travar o tamanho de verdade (w-full embutido no Input empata em
          especificidade CSS com uma largura passada por fora). */}
      <div className="w-[4.5rem] shrink-0">
        <Input
          disabled={disabled}
          value={texto}
          placeholder="00:00"
          inputMode="numeric"
          aria-label="Tempo vendido"
          className="h-7 px-2 text-sm"
          onChange={(e) => setTexto(maskHorasInput(e.target.value))}
          onBlur={(e) => confirmar(e.target.value)}
        />
      </div>
      {PRESETS_TEMPO.map((preset) => (
        <button
          key={preset.minutos}
          type="button"
          disabled={disabled}
          onClick={() => incrementar(preset.minutos)}
          className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-100 disabled:pointer-events-none disabled:opacity-40"
        >
          {preset.label}
        </button>
      ))}
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

const inputInline =
  'h-6 rounded border border-transparent bg-transparent px-1 text-right text-sm text-ink transition-colors ' +
  'hover:border-border focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:hover:border-transparent ' +
  // Some as setinhas de incremento nativas do input number — numa caixa tão
  // pequena elas só engordam o campo sem ajudar em nada.
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 ' +
  '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0';

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
  const [aba, setAba] = useState<'SERVICO' | 'PRODUTO'>('SERVICO');
  // Busca só aparece quando o usuário pede — clicando "Adicionar serviço" ou
  // "Adicionar peça/produto". Escolher uma opção já inclui o item na lista
  // (como uma linha limpa) e fecha a busca; não fica um campo de pesquisa
  // aberto por item já incluído.
  const [adicionando, setAdicionando] = useState<'SERVICO' | 'PRODUTO' | null>(null);
  const [buscaCatalogo, setBuscaCatalogo] = useState('');

  const servicoOptions: ComboboxOption[] =
    servicos?.content?.map((s: ServicoResponse) => ({ value: s.id!, label: s.nome ?? '' })) ?? [];
  const produtoOptions: ComboboxOption[] =
    produtos?.content?.map((p: ProdutoResponse) => ({
      value: p.id!,
      label: p.nome ?? '',
      sublabel: `${p.quantidadeDisponivel ?? 0} disponível(is)`,
    })) ?? [];

  const items: ItemFormValue[] = watch(name) ?? [];
  const total = items.reduce((sum, item) => sum + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0), 0);
  const tempoTotalMinutos = items.reduce((sum, item) => sum + (Number(item.tempoVendidoMinutos) || 0), 0);

  function iniciarAdicao(tipo: 'SERVICO' | 'PRODUTO') {
    setAba(tipo);
    setBuscaCatalogo('');
    setAdicionando(tipo);
  }

  function confirmarAdicao(id: number) {
    if (adicionando === 'SERVICO') {
      const s = servicos?.content?.find((x: ServicoResponse) => x.id === id);
      append({
        tipoItem: 'SERVICO',
        servicoId: id,
        descricao: s?.nome ?? '',
        quantidade: 1,
        valorUnitario: s?.preco ?? 0,
      } as ItemFormValue);
    } else if (adicionando === 'PRODUTO') {
      const p = produtos?.content?.find((x: ProdutoResponse) => x.id === id);
      const qtd = limitarQuantidadeAoEstoque && (p?.quantidadeDisponivel ?? 0) < 1 ? p?.quantidadeDisponivel ?? 0 : 1;
      append({
        tipoItem: 'PRODUTO',
        produtoId: id,
        descricao: p?.nome ?? '',
        quantidade: qtd,
        valorUnitario: p?.precoVenda ?? 0,
      } as ItemFormValue);
    }
    setAdicionando(null);
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

  // Uma linha enxuta por item: descrição, qtd×valor editáveis inline (sem
  // rótulo, só números — o catálogo já foi escolhido na busca) e subtotal.
  // Desconto/reserva/tempo vendido só aparecem numa segunda linha, menor
  // ainda, e somente quando há algo pra mostrar ali.
  function renderLinha(index: number) {
    const field = fields[index];
    const itemId = watch(`${name}.${index}.id`);
    const tipoItem: ItemFormValue['tipoItem'] = watch(`${name}.${index}.tipoItem`);
    const descricao = watch(`${name}.${index}.descricao`);
    const quantidade = Number(watch(`${name}.${index}.quantidade`)) || 0;
    const valorUnitario = Number(watch(`${name}.${index}.valorUnitario`)) || 0;
    const produtoIdSelecionado = watch(`${name}.${index}.produtoId`);
    const produtoSelecionado =
      tipoItem === 'PRODUTO' ? produtos?.content?.find((p: ProdutoResponse) => p.id === produtoIdSelecionado) : undefined;
    const estoqueDisponivelInfo = produtoSelecionado?.quantidadeDisponivel;
    const estoqueMaximo = limitarQuantidadeAoEstoque ? estoqueDisponivelInfo : undefined;
    // Desconto/reserva só fazem sentido pra um item que já existe de verdade
    // no backend (id real) dentro de um registro salvo.
    const podeAgirNoItem = !!origem || !!onGarantirOrigem;
    const pendente = descontoPendente(itemId);
    const mostraLinhaExtra =
      (mostrarTempoVendido && tipoItem === 'SERVICO') ||
      (!podeEditarValor && podeAgirNoItem) ||
      (tipoItem === 'PRODUTO' && !!produtoSelecionado);

    const Icon = tipoItem === 'SERVICO' ? Wrench : Package;

    return (
      <div
        key={field.id}
        data-testid={`item-row-${index}`}
        className="rounded-lg border-b border-border px-2 py-2.5 last:border-0 hover:bg-surface-alt"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={15} className="shrink-0 text-brand-600" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{descricao || '—'}</span>

          {/* O Input compartilhado tem w-full embutido na base — passar w-8 por
              fora empata em especificidade CSS com ele (a ordem no atributo
              class não decide isso, a ordem no stylesheet compilado decide), e
              por isso o campo às vezes renderizava esticado. Um contêiner com
              largura fixa trava o tamanho de verdade, já que o w-full do Input
              passa a valer só dentro dessa caixinha. */}
          <div className="w-9 shrink-0">
            <Input
              aria-label="Quantidade"
              disabled={disabled}
              type="number"
              step="1"
              min="1"
              max={estoqueMaximo}
              className={inputInline}
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
          </div>
          <span className="shrink-0 text-xs text-ink-muted">×</span>
          <div className="w-20 shrink-0">
            <Input
              aria-label="Valor unitário"
              // Só quem aprova desconto (Admin) mexe no preço direto — todo
              // outro perfil solicita desconto em vez de editar aqui.
              disabled={disabled || !podeEditarValor}
              type="number"
              step="0.01"
              className={inputInline}
              {...register(`${name}.${index}.valorUnitario`)}
            />
          </div>

          <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
            {formatCurrency(quantidade * valorUnitario)}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => remove(index)}
            aria-label="Remover item"
            className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-red-50 hover:text-danger disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {mostraLinhaExtra && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            {mostrarTempoVendido && tipoItem === 'SERVICO' && (
              <TempoVendidoInput
                value={watch(`${name}.${index}.tempoVendidoMinutos`)}
                onChange={(minutos) => setValue(`${name}.${index}.tempoVendidoMinutos`, minutos)}
                disabled={disabled}
              />
            )}

            {!podeEditarValor &&
              podeAgirNoItem &&
              (pendente ? (
                <Badge tone="warning">Desconto pendente</Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => agirNoItem(index, setItemParaDesconto)}
                  className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
                >
                  <Percent size={12} /> Solicitar desconto
                </button>
              ))}

            {tipoItem === 'PRODUTO' && produtoSelecionado && (
              <>
                <span className={estoqueDisponivelInfo === 0 ? 'font-medium text-danger' : undefined}>
                  Estoque: {estoqueDisponivelInfo ?? 0}
                </span>
                {podeAgirNoItem && podeReservarEstoque && (estoqueDisponivelInfo ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => agirNoItem(index, setItemParaReserva)}
                    className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
                  >
                    <PackagePlus size={12} /> Reservar
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderLista(tipo: 'SERVICO' | 'PRODUTO', indices: number[]) {
    return (
      <div>
        {adicionando === tipo && (
          <div className="mb-2 flex items-start gap-2">
            <div className="flex-1">
              <Combobox
                placeholder={tipo === 'SERVICO' ? 'Buscar serviço...' : 'Buscar produto...'}
                value={undefined}
                onChange={confirmarAdicao}
                options={
                  tipo === 'SERVICO'
                    ? buscaCatalogo.trim()
                      ? servicoOptions.filter((o) => o.label.toLowerCase().includes(buscaCatalogo.trim().toLowerCase()))
                      : servicoOptions
                    : buscaCatalogo.trim()
                      ? produtoOptions.filter((o) => o.label.toLowerCase().includes(buscaCatalogo.trim().toLowerCase()))
                      : produtoOptions
                }
                query={buscaCatalogo}
                onQueryChange={setBuscaCatalogo}
              />
            </div>
            <button
              type="button"
              onClick={() => setAdicionando(null)}
              aria-label="Cancelar"
              className="mt-2 shrink-0 rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {indices.length === 0 ? (
          <p className="py-2 text-sm text-ink-muted">
            {tipo === 'SERVICO' ? 'Nenhum serviço adicionado ainda.' : 'Nenhuma peça/produto adicionada ainda.'}
          </p>
        ) : (
          indices.map((index) => renderLinha(index))
        )}
      </div>
    );
  }

  const indicesServico = fields.map((_, i) => i).filter((i) => watch(`${name}.${i}.tipoItem`) === 'SERVICO');
  const indicesProduto = fields.map((_, i) => i).filter((i) => watch(`${name}.${i}.tipoItem`) === 'PRODUTO');

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink">Itens</p>

      <Tabs
        tabs={[
          { key: 'SERVICO', label: `Serviços${indicesServico.length ? ` (${indicesServico.length})` : ''}` },
          { key: 'PRODUTO', label: `Peças${indicesProduto.length ? ` (${indicesProduto.length})` : ''}` },
        ]}
        active={aba}
        onChange={(key) => setAba(key as 'SERVICO' | 'PRODUTO')}
      />

      <TabPanel hidden={aba !== 'SERVICO'}>{renderLista('SERVICO', indicesServico)}</TabPanel>
      <TabPanel hidden={aba !== 'PRODUTO'}>{renderLista('PRODUTO', indicesProduto)}</TabPanel>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => iniciarAdicao('SERVICO')} disabled={disabled}>
          <Wrench size={14} /> Adicionar serviço
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => iniciarAdicao('PRODUTO')} disabled={disabled}>
          <Package size={14} /> Adicionar peça/produto
        </Button>
      </div>

      {fields.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-alt px-4 py-2.5 text-sm">
          {mostrarTempoVendido && (
            <span className="text-ink-muted">
              Tempo total <span className="font-semibold text-ink">{formatMinutosParaHoras(tempoTotalMinutos)}</span>
            </span>
          )}
          <span className="ml-auto text-ink-muted">
            Total <span className="font-semibold text-ink">{formatCurrency(total)}</span>
          </span>
        </div>
      )}

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
