import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Car, Check, Clock3, LayoutGrid, List, Wallet, X } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import type { CategoriaComplexidade, ServicoResponse } from '@/api/types';
import { formatCurrency } from '@/lib/formatters';
import { ESTILO_CATEGORIA_COMPLEXIDADE } from '@/lib/categoria';
import { CategoriaTile } from '@/features/shared/CategoriaTile';

const SEM_SISTEMA = 'Outros';
// Acompanha a altura da janela, pra a lista não empurrar o resumo da seleção pra fora da tela.
const ALTURA_LISTA = 'h-[clamp(13rem,30vh,22rem)]';

/** Minúsculas e sem acento — "freio" encontra "Freios", "eletrica" encontra "Elétrica". */
function normalizar(texto: string | undefined | null): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const sistemaDe = (s: ServicoResponse) => s.sistema?.trim() || SEM_SISTEMA;

export interface SistemaServicos {
  nome: string;
  quantidade: number;
}

/** Sistemas na ordem em que aparecem no catálogo (que já vem ordenado por assunto), com a contagem de cada um. */
export function agruparPorSistema(servicos: ServicoResponse[]): SistemaServicos[] {
  const contagem = new Map<string, number>();
  for (const s of servicos) contagem.set(sistemaDe(s), (contagem.get(sistemaDe(s)) ?? 0) + 1);
  return Array.from(contagem, ([nome, quantidade]) => ({ nome, quantidade }));
}

/** Filtra pelo termo (nome ou sistema) e, se houver, por um sistema escolhido. */
export function filtrarServicos(servicos: ServicoResponse[], termo: string, sistema: string | null): ServicoResponse[] {
  const t = normalizar(termo.trim());
  return servicos.filter((s) => {
    if (sistema && sistemaDe(s) !== sistema) return false;
    return !t || normalizar(s.nome).includes(t) || normalizar(sistemaDe(s)).includes(t);
  });
}

export interface ResumoSelecao {
  horasMin: number;
  horasMax: number;
  /** null quando algum serviço escolhido não tem preço sugerido — melhor não mostrar um total que subestima. */
  precoMin: number | null;
  precoMax: number | null;
}

export function resumirSelecao(selecionados: ServicoResponse[]): ResumoSelecao {
  let horasMin = 0;
  let horasMax = 0;
  let precoMin: number | null = 0;
  let precoMax: number | null = 0;
  for (const s of selecionados) {
    horasMin += s.tempoMinHoras ?? 0;
    horasMax += s.tempoMaxHoras ?? s.tempoMinHoras ?? 0;
    precoMin = precoMin == null || s.precoMinSugerido == null ? null : precoMin + s.precoMinSugerido;
    precoMax = precoMax == null || s.precoMaxSugerido == null ? null : precoMax + s.precoMaxSugerido;
  }
  return { horasMin, horasMax, precoMin, precoMax };
}

function formatHoras(min: number | undefined | null, max?: number | undefined | null): string {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const menor = min ?? max;
  if (menor == null) return '—';
  return max != null && max !== menor ? `${fmt(menor)}–${fmt(max)} h` : `${fmt(menor)} h`;
}

function formatFaixaPreco(min: number | undefined | null, max: number | undefined | null): string | null {
  if (min == null || max == null) return null;
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
}


export type VisaoServicos = 'lista' | 'cards';
const VISAO_STORAGE_KEY = 'motogest:servicos-visao';

function lerVisao(): VisaoServicos {
  try {
    return localStorage.getItem(VISAO_STORAGE_KEY) === 'cards' ? 'cards' : 'lista';
  } catch {
    return 'lista';
  }
}

/**
 * Escolha de serviços de um catálogo grande, em três partes: os sistemas
 * (Motor, Freios...) numa lista ao lado, a busca e os serviços (em lista ou em
 * cartões, a gosto do usuário), e embaixo o que já foi escolhido com o total de
 * tempo e a faixa de preço sugerida. `sistema` é o agrupamento por assunto do
 * catálogo; a categoria A/B/C é a complexidade, que decide a hora técnica —
 * quando há um veículo (`categoriaVeiculo`), só os serviços da categoria dele
 * são oferecidos, com a opção de ver todos.
 */
export function ServicoPicker({
  servicos,
  value,
  onChange,
  loading,
  error,
  aguardandoVeiculo,
  categoriaVeiculo,
}: {
  servicos: ServicoResponse[];
  value: number[];
  onChange: (ids: number[]) => void;
  loading?: boolean;
  error?: string;
  /** Ainda não há veículo escolhido: a lista fica de fora até haver uma categoria pra filtrar. */
  aguardandoVeiculo?: boolean;
  categoriaVeiculo?: CategoriaComplexidade | null;
}) {
  const [termo, setTermo] = useState('');
  const [sistema, setSistema] = useState<string | null>(null);
  const [todasCategorias, setTodasCategorias] = useState(false);
  const [visao, setVisao] = useState<VisaoServicos>(lerVisao);

  function escolherVisao(nova: VisaoServicos) {
    setVisao(nova);
    try {
      localStorage.setItem(VISAO_STORAGE_KEY, nova);
    } catch {
      // Sem localStorage a escolha só vale até fechar o modal.
    }
  }

  const filtrarPorCategoria = !!categoriaVeiculo && !todasCategorias;
  const base = useMemo(
    () => (filtrarPorCategoria ? servicos.filter((s) => s.categoria === categoriaVeiculo) : servicos),
    [servicos, filtrarPorCategoria, categoriaVeiculo],
  );

  const selecionadosSet = useMemo(() => new Set(value), [value]);
  const porTermo = useMemo(() => filtrarServicos(base, termo, null), [base, termo]);
  const sistemas = useMemo(() => agruparPorSistema(porTermo), [porTermo]);
  const visiveis = useMemo(() => filtrarServicos(base, termo, sistema), [base, termo, sistema]);
  const selecionados = useMemo(() => servicos.filter((s) => selecionadosSet.has(s.id!)), [servicos, selecionadosSet]);
  const resumo = useMemo(() => resumirSelecao(selecionados), [selecionados]);

  function alternar(id: number) {
    onChange(selecionadosSet.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  const temPreco = resumo.precoMin != null && resumo.precoMax != null && selecionados.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {aguardandoVeiculo ? (
        <div
          className={clsx(
            ALTURA_LISTA,
            'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 text-center',
            error ? 'border-danger' : 'border-border',
          )}
        >
          <Car size={28} className="text-ink-muted" aria-hidden="true" />
          <p className="font-medium text-ink">Escolha o veículo para ver os serviços</p>
          <p className="text-sm text-ink-muted">Os serviços são mostrados de acordo com a categoria do veículo.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={termo}
              onChange={setTermo}
              placeholder="Buscar serviço ou sistema (ex.: freio, óleo)..."
              className="min-w-[14rem] flex-1"
            />
            {categoriaVeiculo && (
              <div
                className={clsx(
                  'flex h-11 items-center gap-2.5 rounded-xl border pl-1.5 pr-3 text-sm',
                  filtrarPorCategoria ? ESTILO_CATEGORIA_COMPLEXIDADE[categoriaVeiculo] : 'border-border bg-surface-alt text-ink',
                )}
              >
                {filtrarPorCategoria ? (
                  <CategoriaTile categoria={categoriaVeiculo} size="lg" className="border-0 bg-transparent text-2xl" />
                ) : (
                  <span className="pl-2" />
                )}
                <span className="font-semibold">{filtrarPorCategoria ? `Categoria ${categoriaVeiculo}` : 'Todas as categorias'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTodasCategorias((v) => !v);
                    setSistema(null);
                  }}
                  className="whitespace-nowrap text-sm font-medium text-ink underline underline-offset-2 hover:no-underline"
                >
                  {filtrarPorCategoria ? 'Ver todas as categorias' : `Só categoria ${categoriaVeiculo}`}
                </button>
              </div>
            )}
            <AlternadorVisao visao={visao} onChange={escolherVisao} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)]">
            <nav
              aria-label="Filtrar por sistema"
              className="flex flex-wrap gap-1.5 lg:max-h-[clamp(13rem,30vh,22rem)] lg:flex-col lg:flex-nowrap lg:gap-1 lg:overflow-y-auto lg:pr-1"
            >
              <BotaoSistema ativo={sistema === null} onClick={() => setSistema(null)} rotulo="Todos" quantidade={porTermo.length} />
              {sistemas.map((s) => (
                <BotaoSistema
                  key={s.nome}
                  ativo={sistema === s.nome}
                  onClick={() => setSistema(sistema === s.nome ? null : s.nome)}
                  rotulo={s.nome}
                  quantidade={s.quantidade}
                />
              ))}
            </nav>

            <div
              className={clsx(
                ALTURA_LISTA,
                'overflow-y-auto rounded-xl border',
                visao === 'cards' && 'p-3',
                error ? 'border-danger' : 'border-border',
              )}
            >
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner />
                </div>
              ) : visiveis.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-ink-muted">
                  {termo ? `Nenhum serviço encontrado para "${termo}".` : 'Nenhum serviço cadastrado.'}
                </p>
              ) : visao === 'cards' ? (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visiveis.map((s) => (
                    <li key={s.id}>
                      <CartaoServico servico={s} marcado={selecionadosSet.has(s.id!)} onAlternar={() => alternar(s.id!)} />
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <div
                    className={clsx(
                      GRADE_LINHA,
                      'sticky top-0 z-10 border-b border-border bg-surface-alt px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted',
                    )}
                  >
                    <span />
                    <span>Serviço</span>
                    <span className="hidden sm:block">Cat.</span>
                    <span className="hidden text-right sm:block">Tempo</span>
                    <span className="hidden text-right md:block">Valor sugerido</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {visiveis.map((s) => (
                      <li key={s.id}>
                        <LinhaServico servico={s} marcado={selecionadosSet.has(s.id!)} onAlternar={() => alternar(s.id!)} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </>
      )}
      {error && <p className="-mt-2 text-xs font-medium text-danger">{error}</p>}

      <div className="rounded-xl bg-surface-alt px-4 py-3">
        {selecionados.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum serviço selecionado ainda.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {selecionados.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => alternar(s.id!)}
                  aria-label={`Remover ${s.nome}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 py-1 pl-3 pr-2 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                >
                  <span className="truncate">{s.nome}</span>
                  <X size={12} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span className="font-semibold text-ink">
                {selecionados.length} {selecionados.length === 1 ? 'serviço' : 'serviços'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-ink-muted">
                <Clock3 size={14} aria-hidden="true" /> {formatHoras(resumo.horasMin, resumo.horasMax)} estimadas
              </span>
              {temPreco && (
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <Wallet size={14} aria-hidden="true" />
                  {formatFaixaPreco(resumo.precoMin, resumo.precoMax)} sugerido
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Mesmas colunas no cabeçalho e nas linhas da lista, pra os valores alinharem.
const GRADE_LINHA =
  'grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[1.25rem_minmax(0,1fr)_2rem_5rem] md:grid-cols-[1.25rem_minmax(0,1fr)_2rem_5rem_12rem]';

function MarcaSelecao({ marcado }: { marcado: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
        marcado ? 'border-brand-600 bg-brand-600 text-white' : 'border-border text-transparent',
      )}
    >
      <Check size={13} strokeWidth={3} />
    </span>
  );
}

function LinhaServico({
  servico,
  marcado,
  onAlternar,
}: {
  servico: ServicoResponse;
  marcado: boolean;
  onAlternar: () => void;
}) {
  const preco = formatFaixaPreco(servico.precoMinSugerido, servico.precoMaxSugerido);
  return (
    <label
      className={clsx(
        GRADE_LINHA,
        'cursor-pointer px-3 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-brand-400',
        marcado ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-surface-alt',
      )}
    >
      <input type="checkbox" checked={marcado} onChange={onAlternar} className="sr-only" />
      <MarcaSelecao marcado={marcado} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">{servico.nome}</span>
        <span className="flex items-center gap-2 truncate text-xs text-ink-muted">
          {/* No celular a coluna de categoria some, então o selo vai pra cá. */}
          {servico.categoria && <CategoriaTile categoria={servico.categoria} size="sm" className="sm:hidden" />}
          {servico.sistema}
          <span className="sm:hidden">· {formatHoras(servico.tempoMinHoras, servico.tempoMaxHoras)}</span>
        </span>
      </span>
      <span className="hidden sm:block">{servico.categoria && <CategoriaTile categoria={servico.categoria} size="md" />}</span>
      <span className="hidden text-right text-ink-muted sm:block">{formatHoras(servico.tempoMinHoras, servico.tempoMaxHoras)}</span>
      <span className="hidden whitespace-nowrap text-right font-medium text-ink md:block">{preco ?? '—'}</span>
    </label>
  );
}

function CartaoServico({
  servico,
  marcado,
  onAlternar,
}: {
  servico: ServicoResponse;
  marcado: boolean;
  onAlternar: () => void;
}) {
  const preco = formatFaixaPreco(servico.precoMinSugerido, servico.precoMaxSugerido);
  return (
    <label
      className={clsx(
        'relative flex h-full cursor-pointer flex-col gap-2 rounded-xl border p-3.5 transition-colors',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400',
        marcado
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
          : 'border-border bg-surface hover:border-brand-300 hover:bg-surface-alt',
      )}
    >
      <input type="checkbox" checked={marcado} onChange={onAlternar} className="sr-only" />
      <span className="flex items-start gap-3">
        <span className="mt-0.5">
          <MarcaSelecao marcado={marcado} />
        </span>
        <span className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-snug text-ink">{servico.nome}</span>
        {servico.categoria && <CategoriaTile categoria={servico.categoria} size="md" />}
      </span>
      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-8 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Clock3 size={12} aria-hidden="true" /> {formatHoras(servico.tempoMinHoras, servico.tempoMaxHoras)}
        </span>
        {servico.sistema && <span className="truncate">{servico.sistema}</span>}
      </span>
      {preco && <span className="pl-8 text-sm font-medium text-ink">{preco}</span>}
    </label>
  );
}

function AlternadorVisao({ visao, onChange }: { visao: VisaoServicos; onChange: (v: VisaoServicos) => void }) {
  const opcoes = [
    { valor: 'lista' as const, icone: List, rotulo: 'Ver em lista' },
    { valor: 'cards' as const, icone: LayoutGrid, rotulo: 'Ver em cards' },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Modo de exibição"
      className="flex h-11 items-center gap-1 rounded-xl border border-border bg-surface-alt p-1"
    >
      {opcoes.map(({ valor, icone: Icone, rotulo }) => (
        <button
          key={valor}
          type="button"
          role="radio"
          aria-checked={visao === valor}
          aria-label={rotulo}
          title={rotulo}
          onClick={() => onChange(valor)}
          className={clsx(
            'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
            visao === valor ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-muted hover:text-ink',
          )}
        >
          <Icone size={17} />
        </button>
      ))}
    </div>
  );
}

function BotaoSistema({
  rotulo,
  quantidade,
  ativo,
  onClick,
}: {
  rotulo: string;
  quantidade: number;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={clsx(
        'inline-flex items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        'lg:w-full lg:rounded-lg lg:border-transparent lg:px-3 lg:py-2 lg:text-left',
        ativo
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-border bg-surface text-ink-muted hover:border-brand-300 hover:text-ink lg:bg-transparent lg:hover:bg-surface-alt',
      )}
    >
      <span className="truncate">{rotulo}</span>
      <span className={clsx('text-xs tabular-nums', ativo ? 'text-white/80' : 'text-ink-muted')}>{quantidade}</span>
    </button>
  );
}
