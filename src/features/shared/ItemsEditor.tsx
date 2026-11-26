import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Percent, PackagePlus, Wrench, Package, Gauge, Copy, Plus } from 'lucide-react';
import { CaretDown, PencilSimple, Trash, X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { useCategoriasHoraTecnica } from '@/hooks/useHoraTecnica';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { Input } from '@/components/ui/Field';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useServicos } from '@/hooks/useServicos';
import { useProdutos } from '@/hooks/useProdutos';
import { useAuthStore } from '@/store/authStore';
import { useDescontosPorOrigem } from '@/hooks/useDescontos';
import { SolicitarDescontoModal } from './SolicitarDescontoModal';
import { ReservarEstoqueModal } from './ReservarEstoqueModal';
import { formatCurrency, formatMinutosParaHoras, parseHorasParaMinutos, maskHorasInput } from '@/lib/formatters';
import { toast } from '@/store/toastStore';
import { acrescimoSobreBase, lucroDoItem, margemSobrePreco, precoComAcrescimo } from '@/lib/margem';
import type { CategoriaComplexidade, CategoriaHoraTecnicaResponse, OrigemDesconto, ProdutoResponse, ServicoResponse } from '@/api/types';

// Incrementam o tempo já digitado em vez de substituí-lo — clicar "+1:00" duas
// vezes soma 2h, não trava em 1h — por isso o rótulo tem o "+" explícito.
const PRESETS_TEMPO = [
  { label: '+0:30', minutos: 30 },
  { label: '+1:00', minutos: 60 },
  { label: '+2:00', minutos: 120 },
];

/** O tempo vendido é cobrado em blocos de 30 min (nunca 15 min): qualquer valor sobe pro próximo bloco. */
export function emBlocosDe30(minutos: number): number {
  return Math.ceil(minutos / 30) * 30;
}

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
  const focado = useRef(false);

  // Mantém o texto exibido em sincronia quando o valor muda por fora (preset,
  // reset do formulário ao carregar um orçamento existente etc.). Não mexe no
  // texto enquanto o usuário digita: reformatar no meio da digitação o atropelaria.
  useEffect(() => {
    if (focado.current) return;
    setTexto(value != null ? formatMinutosParaHoras(value) : '');
  }, [value]);

  // O tempo (e com ele o preço e o resumo) acompanha a digitação assim que o texto já é uma hora
  // válida ("1:30"); antes só atualizava ao sair do campo e o resumo ficava desatualizado.
  function digitar(bruto: string) {
    const mascarado = maskHorasInput(bruto);
    setTexto(mascarado);
    if (mascarado === '') {
      onChange(undefined);
      return;
    }
    const minutos = parseHorasParaMinutos(mascarado);
    if (minutos != null) onChange(emBlocosDe30(minutos));
  }

  function confirmar(bruto: string) {
    const digitado = parseHorasParaMinutos(bruto);
    const minutos = digitado != null ? emBlocosDe30(digitado) : undefined;
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
          onFocus={() => {
            focado.current = true;
          }}
          onChange={(e) => digitar(e.target.value)}
          onBlur={(e) => {
            focado.current = false;
            confirmar(e.target.value);
          }}
        />
      </div>
      {PRESETS_TEMPO.map((preset) => (
        <button
          key={preset.minutos}
          type="button"
          disabled={disabled}
          onClick={() => incrementar(preset.minutos)}
          className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-900/60 disabled:pointer-events-none disabled:opacity-40"
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
  /**
   * Só do form, nunca vai pro backend como campo. `true` = serviço cobrado
   * pela hora técnica da categoria do VEÍCULO do orçamento/OS (valorHora ×
   * tempo vendido, não da categoria do serviço escolhido — essa é só
   * referência de catálogo): o preço acompanha o tempo e vai no payload SEM
   * valorUnitario, pro backend calcular (ver itemParaPayload). `false` =
   * preço fixo (manual, desconto aprovado, categoria sem hora técnica
   * configurada, ou gravado com um valorHora antigo). `undefined` = item
   * carregado ainda não classificado — o editor decide assim que a hora
   * técnica chega.
   */
  precificadoPorHT?: boolean;
  /**
   * INTERNO da oficina (só Orçamento, item livre): o valor da peça — nunca aparece pro cliente nem no
   * PDF/link público. Vai ao backend (que guarda como custo) junto com o valorUnitario FINAL.
   */
  custoUnitario?: number;
  /**
   * Só do form: valor da hora (R$/h) do CATÁLOGO do serviço (preço sugerido ÷ tempo mínimo), usado quando a categoria do
   * veículo não tem hora técnica. Com ele, mudar o tempo vendido recalcula o preço (valor da hora × horas);
   * o valorUnitario resultante é enviado normalmente. Digitar o preço à mão desliga isso.
   */
  precoPorHoraCatalogo?: number;
  /** Só do form: acréscimo (%) sobre o valor da peça. valorUnitario (o preço FINAL do cliente) = valor × (1 + %/100). Não vai ao backend. */
  acrescimoPercentual?: number;
}

/** Soma do tempo vendido de todos os itens — usado no rodapé do editor e na referência de hora técnica. */
export function somarTempoVendidoMinutos(items: Pick<ItemFormValue, 'tempoVendidoMinutos'>[]): number {
  return items.reduce((sum, item) => sum + (Number(item.tempoVendidoMinutos) || 0), 0);
}

/**
 * Valor da hora de uma categoria (A/B/C), ou undefined se a oficina não
 * configurou essa categoria ainda. Quem decide o preço de um item de
 * Orçamento/OS é a categoria do VEÍCULO, não a do Serviço escolhido no
 * catálogo (que virou só referência/sugestão — ver doc de Precificação por
 * Categoria, atualização 29/09) — por isso a assinatura recebe a categoria
 * já resolvida pelo chamador, em vez de um ServicoResponse.
 */
export function valorHoraDaCategoria(
  categorias: CategoriaHoraTecnicaResponse[] | undefined,
  categoria: CategoriaComplexidade | undefined,
): number | undefined {
  if (!categoria) return undefined;
  const valor = categorias?.find((c) => c.categoria === categoria)?.valorHora;
  // 0 = oficina marcou a categoria como "não utilizada" — sem hora técnica.
  return valor != null && valor > 0 ? valor : undefined;
}

/**
 * Único, comum às 3 categorias — vem em cada item de `/financeiro/hora-tecnica`
 * (ver CategoriaHoraTecnicaRequest). Procura o primeiro item com o campo
 * preenchido em vez de assumir a posição 0: nada garante a ordem do array (só
 * o payload de escrita, CategoriaHoraTecnicaRequest, é que impõe um valor só
 * pras 3 categorias).
 */
export function arredondamentoComercial(categorias: CategoriaHoraTecnicaResponse[] | undefined): number | undefined {
  return categorias?.find((c) => c.arredondamentoComercial != null)?.arredondamentoComercial;
}

/**
 * valorHora × horas, arredondado pra CIMA em múltiplos do arredondamento
 * comercial — espelha a regra do backend (ver doc de Precificação por
 * Categoria de Serviço). O `- 1e-9` evita que um valor já exato no múltiplo
 * suba um degrau por erro de ponto flutuante (ex.: 100.00000000001).
 */
export function valorPorCategoria(valorHora: number, minutos: number, arredondamento: number): number {
  const bruto = valorHora * (minutos / 60);
  if (arredondamento <= 0) return bruto;
  return Math.ceil(bruto / arredondamento - 1e-9) * arredondamento;
}

/** Serviços cobrados pela hora técnica que ainda estão sem tempo vendido — o backend recusaria o item. */
export function temServicoPorHTSemTempo(items: Pick<ItemFormValue, 'precificadoPorHT' | 'tempoVendidoMinutos'>[]) {
  return items.some((item) => item.precificadoPorHT && !(Number(item.tempoVendidoMinutos) > 0));
}

export const MENSAGEM_SERVICO_SEM_TEMPO = 'Informe o tempo vendido dos serviços cobrados pela hora técnica';

/**
 * Mensagem de erro da lista de itens como um todo (min(1), refine). Com algum
 * item já registrado no form, o resolver do zod põe esse erro em
 * `errors.itens.root` em vez de `errors.itens.message` — sem olhar os dois,
 * o save fica bloqueado sem explicação nenhuma.
 */
export function erroListaItens(erro: unknown): string | undefined {
  const e = erro as { message?: unknown; root?: { message?: unknown } } | undefined;
  const mensagem = e?.root?.message ?? e?.message;
  return typeof mensagem === 'string' ? mensagem : undefined;
}

/**
 * Item do form → ItemRequest. `id` e `precificadoPorHT` são só do form. Um
 * serviço cobrado pela hora técnica vai sem valorUnitario: o backend calcula
 * PHT × horas (ItemRequest.valorUnitario é opcional nesse caso). Qualquer
 * outro item leva o valor que está na tela — é assim que um desconto
 * aprovado ou um preço gravado com um PHT antigo sobrevive a um novo save.
 */
export function itemParaPayload<T extends ItemFormValue>({
  id: _id,
  precificadoPorHT,
  acrescimoPercentual: _acrescimo,
  precoPorHoraCatalogo: _porHora,
  ...item
}: T) {
  if (precificadoPorHT && item.tipoItem === 'SERVICO' && Number(item.tempoVendidoMinutos) > 0) {
    return { ...item, valorUnitario: undefined };
  }
  return item;
}

/** Custo, lucro e margem agregados dos itens que têm custo. undefined quando nenhum tem. */
export function resumoCustoLucro(items: Pick<ItemFormValue, 'custoUnitario' | 'valorUnitario' | 'quantidade'>[]) {
  const comCusto = items.filter((i) => i.custoUnitario != null);
  if (comCusto.length === 0) return undefined;
  const custo = comCusto.reduce((s, i) => s + Number(i.custoUnitario) * (Number(i.quantidade) || 0), 0);
  const venda = comCusto.reduce((s, i) => s + Number(i.valorUnitario) * (Number(i.quantidade) || 0), 0);
  return { custo, lucro: venda - custo, margem: margemSobrePreco(custo, venda) };
}

/** Item sem vínculo com catálogo nem estoque: digitado direto no orçamento. */
export function itemEhLivre(item: Pick<ItemFormValue, 'servicoId' | 'produtoId'>): boolean {
  return !item.servicoId && !item.produtoId;
}

/** Subtotais do resumo: cadastro de serviço, cadastro de produto e itens livres (sem vínculo). */
export function totaisPorTipo(items: Pick<ItemFormValue, 'servicoId' | 'produtoId' | 'tipoItem' | 'quantidade' | 'valorUnitario'>[]) {
  const totais = { servicos: 0, produtos: 0, livres: 0 };
  for (const i of items) {
    const subtotal = (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0);
    if (itemEhLivre(i)) totais.livres += subtotal;
    else if (i.tipoItem === 'PRODUTO') totais.produtos += subtotal;
    else totais.servicos += subtotal;
  }
  return totais;
}

type TipoNovoItem = 'SERVICO' | 'PRODUTO' | 'LIVRE';

const TIPOS_NOVO_ITEM = [
  { valor: 'SERVICO', rotulo: 'Serviço', Icone: Wrench, apoio: 'Pesquise o serviço no catálogo e clique em Adicionar.' },
  { valor: 'PRODUTO', rotulo: 'Peça / produto', Icone: Package, apoio: 'Pesquise a peça ou produto do estoque e clique em Adicionar.' },
  {
    valor: 'LIVRE',
    rotulo: 'Item livre',
    Icone: PencilSimple,
    apoio: 'Para o que não está no catálogo: clique em Adicionar e informe descrição, valor da peça e acréscimo na linha criada.',
  },
] as const;

export interface OrigemDoValor {
  rotulo: string;
  /** success = o sistema calculou a partir de uma regra; warning = alguém digitou. */
  tom: 'success' | 'warning';
}

/**
 * De onde veio o preço unitário da linha — nunca um valor sem identificação. Só afirma "cadastro"
 * quando o preço ainda bate com o do cadastro; qualquer outro caso é valor informado.
 */
export function origemDoValor(args: {
  tipoItem: 'SERVICO' | 'PRODUTO';
  valorUnitario: number;
  porAcrescimo?: boolean;
  porHT?: boolean;
  porHoraCatalogo?: boolean;
  precoCadastroProduto?: number;
}): OrigemDoValor {
  if (args.porAcrescimo) return { rotulo: 'Valor da peça + acréscimo', tom: 'success' };
  if (args.porHT) return { rotulo: 'Hora técnica', tom: 'success' };
  if (args.porHoraCatalogo) return { rotulo: 'Valor da hora do catálogo', tom: 'success' };
  if (
    args.tipoItem === 'PRODUTO' &&
    args.precoCadastroProduto != null &&
    Number(args.valorUnitario) === Number(args.precoCadastroProduto)
  ) {
    return { rotulo: 'Cadastro do produto', tom: 'success' };
  }
  return { rotulo: 'Valor manual', tom: 'warning' };
}

// Campos de preço do item livre: o consultor mexe só neles, então ganham caixa visível e texto grande.
const campoDestaque =
  'h-10 rounded-lg border-2 border-brand-300 bg-white px-3 text-right text-base font-semibold text-ink shadow-sm ' +
  'placeholder:font-normal placeholder:text-ink-muted/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400 ' +
  'dark:border-brand-700 dark:bg-graphite-2 disabled:opacity-60 ' +
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

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
  categoriaVeiculo,
  disabled,
  limitarQuantidadeAoEstoque,
  origem,
  onGarantirOrigem,
  permitirItemLivre,
  ocultarResumo,
}: {
  name: string;
  // A tela que usa o editor mostra o resumo (totais, tempo, lucro) por conta própria — evita duplicá-lo aqui.
  ocultarResumo?: boolean;
  mostrarTempoVendido?: boolean;
  // Orçamento: permite itens sem cadastro (descrição + custo + margem). OS não passa — lá o item
  // vem do orçamento aprovado e o custo é dado interno que a OS ainda não guarda.
  permitirItemLivre?: boolean;
  // Categoria do veículo do Orçamento/OS em edição — é ela, não a categoria
  // do Serviço escolhido, que decide o valorHora aplicado (ver
  // valorHoraDaCategoria). undefined enquanto nenhum veículo foi selecionado
  // ainda: cai pro preço manual, igual a uma categoria sem hora técnica
  // configurada.
  categoriaVeiculo?: CategoriaComplexidade;
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
  // Orçamento: área "Adicionar item" no topo — tipo escolhido e (para catálogo) o item pesquisado, à espera do botão Adicionar.
  const [tipoNovo, setTipoNovo] = useState<TipoNovoItem>('SERVICO');
  const [catalogoSelecionado, setCatalogoSelecionado] = useState<number | undefined>(undefined);

  // Causa e efeito no mesmo lugar: ao incluir um item (ação do usuário — não o carregamento de um registro salvo),
  // a linha nova rola pra dentro da tela e fica realçada por um instante. O botão de adicionar fica longe da lista.
  const areaAdicionarRef = useRef<HTMLElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const destacarProximo = useRef(false);
  const [indiceDestacado, setIndiceDestacado] = useState<number | null>(null);
  function marcarParaDestacar() {
    destacarProximo.current = true;
  }
  const quantidadeLinhas = fields.length;
  // Linhas de item livre com o bloco de preço aberto (chave = id do useFieldArray). Item carregado nasce fechado.
  const [precoAbertoEm, setPrecoAbertoEm] = useState<Set<string>>(() => new Set());
  const camposRef = useRef(fields);
  camposRef.current = fields;
  function alternarPreco(chave: string) {
    setPrecoAbertoEm((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(chave)) novo.add(chave);
      return novo;
    });
  }
  useEffect(() => {
    if (!destacarProximo.current) return;
    destacarProximo.current = false;
    const indice = quantidadeLinhas - 1;
    if (indice < 0) return;
    const chave = camposRef.current[indice]?.id;
    if (chave) setPrecoAbertoEm((atual) => new Set(atual).add(chave));
    setIndiceDestacado(indice);
    listaRef.current?.querySelector(`[data-testid="item-row-${indice}"]`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    const t = setTimeout(() => setIndiceDestacado(null), 1600);
    return () => clearTimeout(t);
  }, [quantidadeLinhas]);

  // "Adicionar do catálogo" no fim da lista: leva a busca do cartão de cima pra vista e já foca nela.
  function irParaBuscaDoCatalogo() {
    if (tipoNovo === 'LIVRE') setTipoNovo('SERVICO');
    areaAdicionarRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    setTimeout(() => areaAdicionarRef.current?.querySelector('input')?.focus(), 250);
  }

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
  const tempoTotalMinutos = somarTempoVendidoMinutos(items);
  // Só dos itens com custo informado — sem custo não dá pra falar em lucro, e somar só uma parte
  // como se fosse o total enganaria. Painel interno: nunca vai pro cliente.
  const resumoInterno = permitirItemLivre ? resumoCustoLucro(items) : undefined;

  // Valor da hora por categoria (A/B/C): com a categoria do VEÍCULO
  // conhecida, o serviço é cobrado por tempo (valorHora × horas) e não por um
  // preço fixo de catálogo (que nem existe mais — ver ServicoResponse). Só
  // vale onde o tempo vendido aparece pra ser editado. Falha na consulta =
  // segue com preço manual, sem toast (referência opcional, ver
  // prohibited-actions #10).
  const { data: categoriasHT } = useCategoriasHoraTecnica({ silentError: true });
  const arredondamento = mostrarTempoVendido ? arredondamentoComercial(categoriasHT) : undefined;

  // Itens carregados de um registro salvo chegam sem classificação. Um
  // serviço cujo valor gravado bate com valorHora(categoria) × tempo continua
  // atrelado à hora técnica (o preço acompanha se o tempo mudar); qualquer
  // outro valor — desconto aprovado, preço manual, categoria sem hora técnica
  // configurada, valor que mudou depois — é preservado.
  useEffect(() => {
    if (arredondamento == null) return;
    items.forEach((item, index) => {
      if (item.precificadoPorHT !== undefined) return;
      if (item.tipoItem !== 'SERVICO') return;
      const minutos = Number(item.tempoVendidoMinutos) || 0;
      const valorHora = valorHoraDaCategoria(categoriasHT, categoriaVeiculo);
      const porHT =
        minutos > 0 && valorHora != null && Number(item.valorUnitario) === valorPorCategoria(valorHora, minutos, arredondamento);
      setValue(`${name}.${index}.precificadoPorHT`, porHT, { shouldDirty: false });
    });
  }, [items, categoriasHT, categoriaVeiculo, arredondamento, name, setValue]);

  // Trocar o veículo por outro de categoria diferente reprecifica os itens
  // cobrados por hora técnica — senão ficam com o valor da categoria anterior.
  // Só reage a troca entre duas categorias conhecidas: o carregamento inicial
  // (undefined → categoria) não pode sobrescrever preço gravado/com desconto.
  const categoriaAnterior = useRef(categoriaVeiculo);
  useEffect(() => {
    const anterior = categoriaAnterior.current;
    categoriaAnterior.current = categoriaVeiculo;
    if (!anterior || !categoriaVeiculo || anterior === categoriaVeiculo || arredondamento == null) return;
    const valorHora = valorHoraDaCategoria(categoriasHT, categoriaVeiculo);
    const atuais: ItemFormValue[] = getValues(name) ?? [];
    atuais.forEach((item, index) => {
      if (item.tipoItem !== 'SERVICO' || !item.precificadoPorHT) return;
      const minutos = Number(item.tempoVendidoMinutos) || 0;
      if (valorHora != null) {
        setValue(`${name}.${index}.valorUnitario`, valorPorCategoria(valorHora, minutos, arredondamento));
      } else {
        setValue(`${name}.${index}.precificadoPorHT`, false);
      }
    });
  }, [categoriaVeiculo, categoriasHT, arredondamento, name, getValues, setValue]);

  // Serviço do catálogo incluído ANTES de haver veículo/hora técnica entra com o preço sugerido (fixo). Quando a hora
  // técnica da categoria do veículo passa a existir, ele é reprecificado — mas só se ainda for exatamente o que o
  // sistema colocou: item já salvo (id), preço digitado ou desconto aprovado ficam como estão.
  useEffect(() => {
    if (arredondamento == null || !servicos?.content) return;
    const valorHora = valorHoraDaCategoria(categoriasHT, categoriaVeiculo);
    if (valorHora == null) return;
    let ajustou = false;
    items.forEach((item, index) => {
      if (item.tipoItem !== 'SERVICO' || item.precificadoPorHT !== false || item.id != null || !item.servicoId) return;
      const servico = servicos.content?.find((s: ServicoResponse) => s.id === item.servicoId);
      // Preço calculado pelo sistema (valor da hora do catálogo) ou ainda o sugerido: é do sistema, pode trocar.
      const doSistema = item.precoPorHoraCatalogo != null || Number(item.valorUnitario) === (servico?.precoMinSugerido ?? 0);
      if (!servico || !doSistema) return;
      const minutos =
        Number(item.tempoVendidoMinutos) > 0
          ? Number(item.tempoVendidoMinutos)
          : servico.tempoMinHoras != null
            ? Math.round(servico.tempoMinHoras * 60)
            : 0;
      if (minutos <= 0) return;
      setValue(`${name}.${index}.tempoVendidoMinutos`, minutos);
      setValue(`${name}.${index}.valorUnitario`, valorPorCategoria(valorHora, minutos, arredondamento));
      setValue(`${name}.${index}.precificadoPorHT`, true);
      setValue(`${name}.${index}.precoPorHoraCatalogo`, undefined);
      ajustou = true;
    });
    if (ajustou) toast.success(`Serviços reprecificados pela hora técnica da categoria ${categoriaVeiculo}.`);
  }, [items, servicos, categoriasHT, categoriaVeiculo, arredondamento, name, setValue]);

  function alterarTempoVendido(index: number, minutos: number | undefined) {
    setValue(`${name}.${index}.tempoVendidoMinutos`, minutos);
    // Sem hora técnica da categoria, o serviço pode ter o valor da hora do catálogo: 1h = R$ 450 → 1:30 = R$ 675.
    const porHoraCatalogo = getValues(`${name}.${index}.precoPorHoraCatalogo`) as number | undefined;
    if (porHoraCatalogo != null && !getValues(`${name}.${index}.precificadoPorHT`)) {
      setValue(`${name}.${index}.valorUnitario`, Math.round(porHoraCatalogo * ((minutos ?? 0) / 60) * 100) / 100);
      return;
    }
    if (arredondamento == null || !getValues(`${name}.${index}.precificadoPorHT`)) return;
    const valorHora = valorHoraDaCategoria(categoriasHT, categoriaVeiculo);
    if (valorHora != null) {
      setValue(`${name}.${index}.valorUnitario`, valorPorCategoria(valorHora, minutos ?? 0, arredondamento));
    }
  }

  // Troca um serviço de preço fixo pelo preço da hora técnica da categoria do veículo (valorHora × tempo vendido).
  function usarHoraTecnica(index: number) {
    const valorHora = valorHoraDaCategoria(categoriasHT, categoriaVeiculo);
    const minutos = Number(getValues(`${name}.${index}.tempoVendidoMinutos`)) || 0;
    if (valorHora == null || arredondamento == null || minutos <= 0) return;
    setValue(`${name}.${index}.precificadoPorHT`, true, { shouldDirty: true });
    setValue(`${name}.${index}.precoPorHoraCatalogo`, undefined);
    setValue(`${name}.${index}.valorUnitario`, valorPorCategoria(valorHora, minutos, arredondamento), { shouldDirty: true });
  }

  // Item livre entra já vazio e pronto pra digitar — não abre busca nem cadastro. Nasce como peça (o caso comum,
  // e o preço dele é "valor da peça + acréscimo"); o consultor troca pra serviço na própria linha.
  function adicionarItemLivre() {
    marcarParaDestacar();
    append({
      tipoItem: 'PRODUTO',
      descricao: '',
      quantidade: 1,
      valorUnitario: 0,
      precificadoPorHT: false,
    } as ItemFormValue);
    setAdicionando(null);
  }

  // Duplica a linha sem o id (é um item novo) — útil pra variações do mesmo item. Mantém custo/margem.
  function duplicarItem(index: number) {
    const { id: _id, ...copia } = getValues(`${name}.${index}`) as ItemFormValue;
    marcarParaDestacar();
    append(copia as ItemFormValue);
  }

  // Item livre: o consultor digita SÓ o valor da peça e o acréscimo; o preço unitário que o cliente vê é o resultado
  // (valor × (1 + %/100)) e nunca é digitado. Sem acréscimo, o preço é o próprio valor.
  function alterarValorOuAcrescimo(index: number, campo: 'custoUnitario' | 'acrescimoPercentual', texto: string) {
    const valor = texto.trim() === '' ? undefined : Number(texto);
    setValue(`${name}.${index}.${campo}`, valor);
    const base = getValues(`${name}.${index}.custoUnitario`) as number | undefined;
    const acrescimo = getValues(`${name}.${index}.acrescimoPercentual`) as number | undefined;
    setValue(`${name}.${index}.precificadoPorHT`, false);
    if (base == null) {
      setValue(`${name}.${index}.valorUnitario`, 0);
      return;
    }
    const preco = precoComAcrescimo(base, acrescimo ?? 0);
    if (preco != null) setValue(`${name}.${index}.valorUnitario`, preco);
  }

  // Preço digitado direto (só item de catálogo, por quem aprova desconto): vira preço fixo, fora da hora técnica.
  function alterarPrecoDoItem(index: number) {
    setValue(`${name}.${index}.precificadoPorHT`, false);
    setValue(`${name}.${index}.precoPorHoraCatalogo`, undefined);
  }

  function iniciarAdicao(tipo: 'SERVICO' | 'PRODUTO') {
    setAba(tipo);
    setBuscaCatalogo('');
    setAdicionando(tipo);
  }

  function confirmarAdicao(id: number, tipo: 'SERVICO' | 'PRODUTO' | null = adicionando) {
    marcarParaDestacar();
    if (tipo === 'SERVICO') {
      const s = servicos?.content?.find((x: ServicoResponse) => x.id === id);
      const valorHora = valorHoraDaCategoria(categoriasHT, categoriaVeiculo);
      if (arredondamento != null && valorHora != null) {
        // Com a categoria do veículo configurada, o catálogo só sugere o
        // tempo (tempo mínimo do serviço); o preço sai de valorHora(categoria
        // do veículo) × tempo, nunca de um preço fixo de catálogo (que nem
        // existe mais) nem da categoria do próprio serviço.
        const minutos = s?.tempoMinHoras != null ? emBlocosDe30(Math.round(s.tempoMinHoras * 60)) : undefined;
        append({
          tipoItem: 'SERVICO',
          servicoId: id,
          descricao: s?.nome ?? '',
          quantidade: 1,
          tempoVendidoMinutos: minutos,
          valorUnitario: valorPorCategoria(valorHora, minutos ?? 0, arredondamento),
          precificadoPorHT: true,
        } as ItemFormValue);
      } else {
        // Sem hora técnica da categoria (ou sem veículo ainda): se o catálogo tem preço e tempo mínimo, o valor da
        // hora sai dele (R$ 450 por 1h → 1:30 = R$ 675) e o preço acompanha o tempo vendido. Sem isso, preço manual.
        const minutosCatalogo = s?.tempoMinHoras != null ? emBlocosDe30(Math.round(s.tempoMinHoras * 60)) : 0;
        const porHora =
          mostrarTempoVendido && (s?.precoMinSugerido ?? 0) > 0 && minutosCatalogo > 0
            ? (s!.precoMinSugerido as number) / (minutosCatalogo / 60)
            : undefined;
        append({
          tipoItem: 'SERVICO',
          servicoId: id,
          descricao: s?.nome ?? '',
          quantidade: 1,
          valorUnitario: s?.precoMinSugerido ?? 0,
          tempoVendidoMinutos: porHora != null ? minutosCatalogo : undefined,
          precoPorHoraCatalogo: porHora,
          precificadoPorHT: false,
        } as ItemFormValue);
      }
    } else if (tipo === 'PRODUTO') {
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

  function opcoesDoCatalogo(tipo: 'SERVICO' | 'PRODUTO'): ComboboxOption[] {
    const base = tipo === 'SERVICO' ? servicoOptions : produtoOptions;
    const termo = buscaCatalogo.trim().toLowerCase();
    return termo ? base.filter((o) => o.label.toLowerCase().includes(termo)) : base;
  }

  function adicionarNovo() {
    if (tipoNovo === 'LIVRE') {
      adicionarItemLivre();
      return;
    }
    if (catalogoSelecionado == null) return;
    confirmarAdicao(catalogoSelecionado, tipoNovo);
    setCatalogoSelecionado(undefined);
    setBuscaCatalogo('');
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
    const porHT = tipoItem === 'SERVICO' && !!watch(`${name}.${index}.precificadoPorHT`);
    const tempoItem = Number(watch(`${name}.${index}.tempoVendidoMinutos`)) || 0;
    const porHoraCatalogo = tipoItem === 'SERVICO' ? (watch(`${name}.${index}.precoPorHoraCatalogo`) as number | undefined) : undefined;
    const servicoIdSelecionado = watch(`${name}.${index}.servicoId`);
    const servicoSelecionado =
      tipoItem === 'SERVICO' ? servicos?.content?.find((s: ServicoResponse) => s.id === servicoIdSelecionado) : undefined;
    const valorHoraItem = valorHoraDaCategoria(categoriasHT, categoriaVeiculo);
    const produtoIdSelecionado = watch(`${name}.${index}.produtoId`);
    const produtoSelecionado =
      tipoItem === 'PRODUTO' ? produtos?.content?.find((p: ProdutoResponse) => p.id === produtoIdSelecionado) : undefined;
    const estoqueDisponivelInfo = produtoSelecionado?.quantidadeDisponivel;
    const estoqueMaximo = limitarQuantidadeAoEstoque ? estoqueDisponivelInfo : undefined;
    // Desconto/reserva só fazem sentido pra um item que já existe de verdade
    // no backend (id real) dentro de um registro salvo.
    const podeAgirNoItem = !!origem || !!onGarantirOrigem;
    const pendente = descontoPendente(itemId);
    const temFaixaSugerida =
      !porHT && servicoSelecionado && (servicoSelecionado.precoMinSugerido != null || servicoSelecionado.precoMaxSugerido != null);
    // Item livre (sem catálogo/estoque) é do próprio consultor: descrição, preço, custo e margem são dele.
    const livre = !!permitirItemLivre && itemEhLivre({ servicoId: servicoIdSelecionado, produtoId: produtoIdSelecionado });
    const custo = watch(`${name}.${index}.custoUnitario`) as number | undefined;
    const acrescimo = watch(`${name}.${index}.acrescimoPercentual`) as number | undefined;
    const origemValor = permitirItemLivre
      ? origemDoValor({
          tipoItem,
          valorUnitario,
          porAcrescimo: livre && custo != null,
          porHT,
          porHoraCatalogo: porHoraCatalogo != null,
          precoCadastroProduto: produtoSelecionado?.precoVenda,
        })
      : undefined;
    const mostraLinhaExtra =
      !!origemValor ||
      livre ||
      (mostrarTempoVendido && tipoItem === 'SERVICO') ||
      (!podeEditarValor && podeAgirNoItem) ||
      (tipoItem === 'PRODUTO' && !!produtoSelecionado) ||
      !!temFaixaSugerida;

    const Icon = tipoItem === 'SERVICO' ? Wrench : Package;
    const precoAberto = precoAbertoEm.has(field.id);

    return (
      <div
        key={field.id}
        data-testid={`item-row-${index}`}
        className={clsx(
          'rounded-lg border-b border-border px-2 py-2.5 transition-colors last:border-0 hover:bg-surface-alt',
          indiceDestacado === index && 'bg-brand-50 ring-2 ring-brand-400 dark:bg-brand-900/30',
        )}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={15} className="shrink-0 text-brand-600" />
          {livre ? (
            <>
              <div className="min-w-0 flex-1">
                <Input
                  aria-label="Descrição do item"
                  placeholder="Descrição (ex.: Pastilha de freio dianteira)"
                  disabled={disabled}
                  {...register(`${name}.${index}.descricao`)}
                />
              </div>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{descricao || '—'}</span>
          )}

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
          {/* Mesmas colunas pra todo item (Qtd × Unitário = Total). No item livre o unitário é o resultado de
              valor + acréscimo — só leitura aqui; quem o forma é o bloco "Como formar o preço" logo abaixo. */}
          <span className="shrink-0 text-xs text-ink-muted">×</span>
          {livre ? (
            <span data-testid={`item-unitario-${index}`} className="w-20 shrink-0 px-1 text-right text-sm tabular-nums text-ink">
              {formatCurrency(valorUnitario)}
            </span>
          ) : (
          <div className="w-20 shrink-0">
            <Input
              aria-label="Valor unitário"
              // Só quem aprova desconto (Admin) mexe no preço direto — todo
              // outro perfil solicita desconto em vez de editar aqui.
              disabled={disabled || (!podeEditarValor && !livre)}
              type="number"
              step="0.01"
              className={inputInline}
              {...register(`${name}.${index}.valorUnitario`, {
                // Preço digitado → vira preço fixo, desatrelado da hora técnica e da margem (a margem exibida acompanha).
                onChange: () => alterarPrecoDoItem(index),
              })}
            />
          </div>
          )}

          <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
            {formatCurrency(quantidade * valorUnitario)}
          </span>
          {permitirItemLivre && (
            <IconActionButton
              icon={Copy}
              label="Duplicar item"
              iconSize={15}
              disabled={disabled}
              onClick={() => duplicarItem(index)}
            />
          )}
          <IconActionButton
            icon={Trash}
            label="Remover item"
            tone="danger"
            iconSize={15}
            disabled={disabled}
            onClick={() => remove(index)}
          />
        </div>

        {mostraLinhaExtra && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            {origemValor && !livre && (
              <span data-testid={`item-origem-${index}`}>
                <Badge tone={origemValor.tom}>Origem: {origemValor.rotulo}</Badge>
              </span>
            )}
            {mostrarTempoVendido && tipoItem === 'SERVICO' && !livre && (
              <TempoVendidoInput
                value={watch(`${name}.${index}.tempoVendidoMinutos`)}
                onChange={(minutos) => alterarTempoVendido(index, minutos)}
                disabled={disabled}
              />
            )}

            {livre && (
              <div
                data-testid={`item-interno-${index}`}
                className="mt-1 w-full rounded-xl border border-brand-300/70 bg-brand-50/60 dark:border-brand-700/60 dark:bg-brand-900/20"
              >
                {/* Recolhido, vira uma linha de resumo (mesma altura dos demais itens); aberto só no item recém-criado. */}
                <button
                  type="button"
                  aria-expanded={precoAberto}
                  onClick={() => alternarPreco(field.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                    Como formar o preço · só você vê
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    {custo != null
                      ? `${tipoItem === 'SERVICO' ? 'Serviço' : 'Peça'} ${formatCurrency(custo)} + ${(acrescimo ?? 0).toLocaleString('pt-BR')}% · lucro ${formatCurrency(lucroDoItem(custo, valorUnitario, quantidade))}`
                      : 'Informe o valor'}
                    <CaretDown size={13} aria-hidden="true" className={clsx('transition-transform', precoAberto && 'rotate-180')} />
                  </span>
                </button>
                {precoAberto && (
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2 border-t border-brand-300/50 p-3 dark:border-brand-700/40">
                {/* Peça ou serviço: muda o ícone, o rótulo do valor e se há tempo vendido — antes todo item livre
                    parecia serviço, com campo de horas que não entrava no preço. */}
                {!disabled && (
                  <div className="w-full sm:w-44">
                    <SegmentedControl
                      ariaLabel="Tipo do item"
                      value={tipoItem}
                      onChange={(valor) => setValue(`${name}.${index}.tipoItem`, valor, { shouldDirty: true })}
                      options={[
                        { value: 'PRODUTO', label: 'Peça' },
                        { value: 'SERVICO', label: 'Serviço' },
                      ]}
                    />
                  </div>
                )}
                <label className="flex flex-col gap-1 text-xs font-bold text-brand-700 dark:text-brand-300">
                  {tipoItem === 'SERVICO' ? 'Valor do serviço (R$)' : 'Valor da peça (R$)'}
                  <input
                    aria-label={tipoItem === 'SERVICO' ? 'Valor do serviço' : 'Valor da peça'}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    disabled={disabled}
                    className={campoDestaque + ' w-32'}
                    value={custo ?? ''}
                    onChange={(e) => alterarValorOuAcrescimo(index, 'custoUnitario', e.target.value)}
                  />
                </label>
                <span aria-hidden className="pb-1.5 text-2xl font-bold leading-none text-brand-600 dark:text-brand-300">
                  +
                </span>
                <label className="flex flex-col gap-1 text-xs font-bold text-brand-700 dark:text-brand-300">
                  Acréscimo (%)
                  <input
                    aria-label="Acréscimo (%)"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    disabled={disabled}
                    className={campoDestaque + ' w-24'}
                    value={acrescimo ?? ''}
                    onChange={(e) => alterarValorOuAcrescimo(index, 'acrescimoPercentual', e.target.value)}
                  />
                </label>
                <span aria-hidden className="pb-1.5 text-2xl font-bold leading-none text-brand-600 dark:text-brand-300">
                  =
                </span>
                <div className="flex flex-col gap-1 text-xs font-bold text-green-700 dark:text-green-400">
                  Preço ao cliente (un.)
                  <output
                    data-testid="preco-ao-cliente"
                    className="flex h-10 min-w-28 items-center justify-center rounded-lg bg-green-100 px-4 text-lg font-bold tabular-nums text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  >
                    {formatCurrency(valorUnitario)}
                  </output>
                </div>
                {custo != null && (
                  <span className="pb-2 text-sm font-semibold text-ink">
                    Seu lucro: {formatCurrency(lucroDoItem(custo, valorUnitario, quantidade))}
                  </span>
                )}
                {acrescimo != null && custo == null && (
                  <span className="pb-2 text-sm font-semibold text-danger">Informe o valor da peça</span>
                )}
                </div>
                )}
              </div>
            )}

            {/* Preço fixo num serviço com tempo: mexer no tempo não muda o valor. Em vez de deixar o consultor
                achando que é defeito, diz por que e, quando dá, oferece cobrar pela hora técnica. */}
            {porHoraCatalogo != null && !porHT && (
              <span data-testid={`item-hora-catalogo-${index}`} className="inline-flex items-center gap-1 font-medium text-brand-600 dark:text-brand-300">
                <Gauge size={12} />
                {formatCurrency(porHoraCatalogo)}/h × {formatMinutosParaHoras(tempoItem)} (mín. 30 min) = {formatCurrency(valorUnitario)}
              </span>
            )}

            {mostrarTempoVendido && tipoItem === 'SERVICO' && !livre && !porHT && porHoraCatalogo == null && (
              <span data-testid={`item-preco-fixo-${index}`} className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                {valorHoraItem != null && arredondamento != null ? (
                  <>
                    <span>O tempo não altera este valor (preço fixo).</span>
                    {/* Trocar o preço é de quem aprova desconto (mesmo gate do campo de valor): os demais perfis só
                        recebem a explicação — o preço deles se ajusta sozinho pela hora técnica ao escolher o veículo. */}
                    {podeEditarValor && (
                    <button
                      type="button"
                      disabled={disabled || tempoItem <= 0}
                      title={tempoItem <= 0 ? 'Informe o tempo vendido primeiro' : undefined}
                      onClick={() => usarHoraTecnica(index)}
                      className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Gauge size={12} /> Cobrar pela hora técnica ({formatCurrency(valorHoraItem)}/h)
                    </button>
                    )}
                  </>
                ) : categoriaVeiculo == null ? (
                  <span>Preço fixo — escolha o veículo para cobrar pela hora técnica.</span>
                ) : (
                  <span>Preço fixo — a categoria {categoriaVeiculo} do veículo não tem hora técnica configurada.</span>
                )}
              </span>
            )}

            {porHT && valorHoraItem != null && (
              <span
                className={clsx(
                  'inline-flex items-center gap-1 font-medium',
                  tempoItem > 0 ? 'text-brand-600 dark:text-brand-300' : 'text-danger',
                )}
              >
                <Gauge size={12} />
                {tempoItem > 0
                  ? `Hora técnica ${formatCurrency(valorHoraItem)}/h (cat. ${categoriaVeiculo} do veículo)`
                  : 'Informe o tempo vendido'}
              </span>
            )}

            {temFaixaSugerida && (
              <span className="inline-flex items-center gap-1">
                Sugerido: {formatCurrency(servicoSelecionado?.precoMinSugerido ?? 0)} –{' '}
                {formatCurrency(servicoSelecionado?.precoMaxSugerido ?? 0)}
              </span>
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
            <IconActionButton
              icon={X}
              label="Cancelar"
              className="mt-2"
              onClick={() => setAdicionando(null)}
            />
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
      {permitirItemLivre ? (
        <>
          <section
            ref={areaAdicionarRef}
            aria-label="Adicionar item"
            className="rounded-2xl border border-brand-300/70 bg-gradient-to-br from-brand-50 to-transparent p-4 dark:border-brand-700/60 dark:from-brand-900/30"
          >
            <h3 className="text-base font-semibold text-ink">Adicionar item ao orçamento</h3>
            <p className="text-sm text-ink-muted">{TIPOS_NOVO_ITEM.find((t) => t.valor === tipoNovo)?.apoio}</p>

            <div role="group" aria-label="Tipo de item" className="mt-3 flex flex-wrap gap-2">
              {TIPOS_NOVO_ITEM.map(({ valor, rotulo, Icone }) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={tipoNovo === valor}
                  disabled={disabled}
                  onClick={() => {
                    setTipoNovo(valor);
                    setCatalogoSelecionado(undefined);
                    setBuscaCatalogo('');
                  }}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60',
                    tipoNovo === valor
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-border bg-surface text-ink-muted hover:bg-surface-alt',
                  )}
                >
                  <Icone size={14} /> {rotulo}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-start gap-2">
              {tipoNovo !== 'LIVRE' && (
                <div className="flex-1">
                  <Combobox
                    placeholder={tipoNovo === 'SERVICO' ? 'Pesquisar serviço...' : 'Pesquisar peça ou produto...'}
                    disabled={disabled}
                    value={catalogoSelecionado}
                    onChange={setCatalogoSelecionado}
                    options={opcoesDoCatalogo(tipoNovo)}
                    query={buscaCatalogo}
                    onQueryChange={setBuscaCatalogo}
                  />
                </div>
              )}
              <Button
                type="button"
                size="lg"
                className={tipoNovo === 'LIVRE' ? '' : 'h-[2.625rem]'}
                disabled={disabled || (tipoNovo !== 'LIVRE' && catalogoSelecionado == null)}
                onClick={adicionarNovo}
              >
                <Plus size={16} /> Adicionar
              </Button>
            </div>
          </section>

          <section aria-label="Itens incluídos" className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">Itens incluídos no orçamento</h3>
              <Badge tone="neutral">{fields.length}</Badge>
            </div>
            {fields.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
                Nenhum item incluído ainda. Use a área acima para adicionar.
              </p>
            ) : (
              <div ref={listaRef} className="rounded-xl border border-border">
                {/* Só visual: os campos já têm aria-label próprio (Quantidade, Valor unitário…). */}
                <div
                  aria-hidden="true"
                  className="hidden items-center gap-2.5 rounded-t-xl border-b border-border bg-surface-alt px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted sm:flex"
                >
                  <span className="w-[15px] shrink-0" />
                  <span className="min-w-0 flex-1">Item</span>
                  <span className="w-9 shrink-0 text-center">Qtd</span>
                  <span className="w-2 shrink-0" />
                  <span className="w-20 shrink-0 text-right">Unitário</span>
                  <span className="w-20 shrink-0 text-right">Total</span>
                  <span className="w-[4.75rem] shrink-0" />
                </div>
                {fields.map((_, i) => renderLinha(i))}
              </div>
            )}
            {/* O botão de adicionar do cartão de cima fica longe de quem já está no fim da lista. */}
            {fields.length > 0 && !disabled && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={adicionarItemLivre}>
                  <Plus size={14} /> Adicionar outro item livre
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={irParaBuscaDoCatalogo}>
                  <Plus size={14} /> Adicionar do catálogo
                </Button>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
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

        </>
      )}

      {fields.length > 0 && permitirItemLivre && !ocultarResumo && (
        <dl data-testid="resumo-por-tipo" className="grid grid-cols-3 gap-2 text-sm">
          {[
            ['Serviços', totaisPorTipo(items).servicos],
            ['Peças', totaisPorTipo(items).produtos],
            ['Itens livres', totaisPorTipo(items).livres],
          ].map(([rotulo, valor]) => (
            <div key={rotulo as string} className="rounded-lg border border-border px-3 py-2">
              <dt className="text-xs text-ink-muted">{rotulo}</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatCurrency(valor as number)}</dd>
            </div>
          ))}
        </dl>
      )}

      {fields.length > 0 && !ocultarResumo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-alt px-4 py-2.5 text-sm">
          {mostrarTempoVendido && (
            <span className="text-ink-muted">
              Tempo total <span className="font-semibold text-ink">{formatMinutosParaHoras(tempoTotalMinutos)}</span>
            </span>
          )}
          {resumoInterno && (
            <span data-testid="resumo-interno" className="text-ink-muted">
              Só você vê: valor das peças <span className="font-semibold text-ink">{formatCurrency(resumoInterno.custo)}</span> · lucro{' '}
              <span className="font-semibold text-ink">{formatCurrency(resumoInterno.lucro)}</span>
              {resumoInterno.margem != null && <> ({resumoInterno.margem.toLocaleString('pt-BR')}%)</>}
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
