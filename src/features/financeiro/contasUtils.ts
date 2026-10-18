import { addDays, addMonths, differenceInCalendarDays, format, getDaysInMonth, parseISO } from 'date-fns';

/** O que as contas a pagar e a receber têm em comum e que a tela de Financeiro lê. */
export interface ContaBase {
  valor?: number;
  categoriaId?: number | null;
  dataVencimento?: string;
  status?: string;
}

/**
 * Situação de uma conta pra quem cuida do dinheiro — não é o `status` cru do
 * backend: uma conta PENDENTE com a data já passada é "vencida" mesmo que o
 * backend ainda não a tenha marcado como ATRASADO.
 */
export type SituacaoConta = 'vencida' | 'vence-hoje' | 'a-vencer' | 'quitada' | 'cancelada';

export const SITUACOES: SituacaoConta[] = ['vencida', 'vence-hoje', 'a-vencer', 'quitada', 'cancelada'];

/** Dias até o vencimento: negativo = já venceu. `undefined` quando a conta não tem data. */
export function diasParaVencimento(conta: ContaBase, hoje: Date = new Date()): number | undefined {
  if (!conta.dataVencimento) return undefined;
  return differenceInCalendarDays(parseISO(conta.dataVencimento), hoje);
}

export function situacaoDaConta(conta: ContaBase, hoje: Date = new Date()): SituacaoConta {
  if (conta.status === 'CANCELADO') return 'cancelada';
  if (conta.status === 'PAGO' || conta.status === 'RECEBIDO') return 'quitada';
  if (conta.status === 'ATRASADO') return 'vencida';
  const dias = diasParaVencimento(conta, hoje);
  if (dias == null) return 'a-vencer';
  if (dias < 0) return 'vencida';
  return dias === 0 ? 'vence-hoje' : 'a-vencer';
}

/** "vence hoje", "vence amanhã", "em 10 dias", "venceu ontem", "há 3 dias". */
export function textoVencimento(dias: number | undefined): string {
  if (dias == null) return '';
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return `em ${dias} dias`;
  if (dias === -1) return 'venceu ontem';
  return `há ${Math.abs(dias)} dias`;
}

export interface ResumoSituacao {
  quantidade: number;
  valor: number;
}

export type ResumoContas = Record<SituacaoConta, ResumoSituacao> & { todas: ResumoSituacao };

export function resumirPorSituacao(contas: ContaBase[], hoje: Date = new Date()): ResumoContas {
  const resumo = Object.fromEntries(SITUACOES.map((s) => [s, { quantidade: 0, valor: 0 }])) as Record<SituacaoConta, ResumoSituacao>;
  const todas = { quantidade: 0, valor: 0 };
  for (const conta of contas) {
    const alvo = resumo[situacaoDaConta(conta, hoje)];
    alvo.quantidade++;
    alvo.valor += conta.valor ?? 0;
    todas.quantidade++;
    todas.valor += conta.valor ?? 0;
  }
  return { ...resumo, todas };
}

export interface FiltroContas {
  situacao: SituacaoConta | 'todas';
  /** Uma categoria específica, `'sem'` (ainda não classificadas) ou nada (todas). */
  categoriaId?: number | 'sem';
  termo: string;
  /** Vencimento a partir de (yyyy-MM-dd), inclusive. */
  inicio?: string;
  /** Vencimento até (yyyy-MM-dd), inclusive. */
  fim?: string;
}

function normalizar(texto: string | undefined | null): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filtra por situação, período de vencimento e termo (descrição ou contraparte — fornecedor/cliente). */
export function filtrarContas<T extends ContaBase & { descricao?: string }>(
  contas: T[],
  filtro: FiltroContas,
  contraparte: (conta: T) => string | undefined,
  hoje: Date = new Date(),
): T[] {
  const termo = normalizar(filtro.termo.trim());
  return contas.filter((c) => {
    if (filtro.situacao !== 'todas' && situacaoDaConta(c, hoje) !== filtro.situacao) return false;
    if (filtro.categoriaId === 'sem' && c.categoriaId != null) return false;
    if (typeof filtro.categoriaId === 'number' && c.categoriaId !== filtro.categoriaId) return false;
    if (filtro.inicio && (c.dataVencimento ?? '') < filtro.inicio) return false;
    if (filtro.fim && (c.dataVencimento ?? '') > filtro.fim) return false;
    return !termo || normalizar(c.descricao).includes(termo) || normalizar(contraparte(c)).includes(termo);
  });
}

/** Contas cujo vencimento cai no mês `AAAA-MM` (a competência é a data de vencimento). */
export function doMes<T extends ContaBase>(contas: T[], anoMes: string): T[] {
  return contas.filter((c) => (c.dataVencimento ?? '').startsWith(anoMes));
}

/** Mais antiga primeiro (as vencidas vêm no topo); sem data, por último. */
export function ordenarPorVencimento<T extends ContaBase>(contas: T[]): T[] {
  return [...contas].sort((a, b) => (a.dataVencimento ?? '9999').localeCompare(b.dataVencimento ?? '9999'));
}

export type TipoRepeticao = 'MENSAL' | 'PARCELADO';

export interface ParcelaPrevia {
  numero: number;
  total: number;
  vencimento: string;
  valor: number;
}

/**
 * Prévia do lote que o backend vai gerar ("repetir todo mês" / "parcelar") — mesma regra de
 * `LoteContas.gerar` no backend: MENSAL repete o valor; PARCELADO divide o total em centavos exatos, com a
 * diferença na última parcela; o vencimento anda de mês em mês mantendo o dia (31 vira o último dia dos meses curtos).
 */
export function previaDoLote(valor: number, primeiroVencimento: string, tipo: TipoRepeticao, quantidade: number): ParcelaPrevia[] {
  const inicio = parseISO(primeiroVencimento);
  const centavos = Math.round(valor * 100);
  const porParcela = tipo === 'PARCELADO' ? Math.floor(centavos / quantidade) : centavos;
  let acumulado = 0;
  return Array.from({ length: quantidade }, (_, i) => {
    const ultima = i === quantidade - 1;
    const centavosDaParcela = tipo === 'PARCELADO' && ultima ? centavos - acumulado : porParcela;
    acumulado += centavosDaParcela;
    return {
      numero: i + 1,
      total: quantidade,
      vencimento: format(addMonths(inicio, i), 'yyyy-MM-dd'),
      valor: centavosDaParcela / 100,
    };
  });
}

export interface PeriodoFechamento {
  /** Primeiro dia do período (yyyy-MM-dd) — o dia seguinte ao fechamento anterior. */
  inicio: string;
  /** Dia do fechamento (yyyy-MM-dd). */
  fim: string;
}

/** O dia de fechamento num mês específico — dia 31 vira o último dia dos meses mais curtos. */
function fechamentoDoMes(ano: number, mes: number, dia: number): Date {
  return new Date(ano, mes, Math.min(dia, getDaysInMonth(new Date(ano, mes, 1))));
}

/**
 * Período financeiro (do dia seguinte ao fechamento do mês anterior até o dia de fechamento) que contém `ref`.
 * Com fechamento no dia 20: 18/10 está em 21/09–20/10; 25/10 já está em 21/10–20/11.
 */
export function periodoDeFechamento(diaFechamento: number, ref: Date = new Date()): PeriodoFechamento {
  const fechamentoDesteMes = fechamentoDoMes(ref.getFullYear(), ref.getMonth(), diaFechamento);
  const fim = differenceInCalendarDays(ref, fechamentoDesteMes) <= 0
    ? fechamentoDesteMes
    : fechamentoDoMes(ref.getFullYear(), ref.getMonth() + 1, diaFechamento);
  const fechamentoAnterior = fechamentoDoMes(fim.getFullYear(), fim.getMonth() - 1, diaFechamento);
  return { inicio: format(addDays(fechamentoAnterior, 1), 'yyyy-MM-dd'), fim: format(fim, 'yyyy-MM-dd') };
}

/** Campos extras que o balanço e o ranking de categorias leem. */
export interface ContaFinanceira extends ContaBase {
  categoriaNome?: string;
  valorPago?: number;
}

export interface LadoDoBalanco {
  /** Tudo que vence no mês, exceto canceladas. */
  previsto: number;
  /** O que já foi pago/recebido (valor efetivo, com juros ou desconto). */
  realizado: number;
}

export interface BalancoDoMes {
  receitas: LadoDoBalanco;
  despesas: LadoDoBalanco;
  resultadoPrevisto: number;
  resultadoRealizado: number;
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function somarLado(contas: ContaFinanceira[]): LadoDoBalanco {
  let previsto = 0;
  let realizado = 0;
  for (const c of contas) {
    const situacao = situacaoDaConta(c);
    if (situacao === 'cancelada') continue;
    previsto += c.valor ?? 0;
    if (situacao === 'quitada') realizado += c.valorPago ?? c.valor ?? 0;
  }
  return { previsto: arredondar(previsto), realizado: arredondar(realizado) };
}

/** Balanço de contas já filtradas pelo mês: previsto (o que vence) × realizado (o que já foi quitado). */
export function balancoDoMes(receber: ContaFinanceira[], pagar: ContaFinanceira[]): BalancoDoMes {
  const receitas = somarLado(receber);
  const despesas = somarLado(pagar);
  return {
    receitas,
    despesas,
    resultadoPrevisto: arredondar(receitas.previsto - despesas.previsto),
    resultadoRealizado: arredondar(receitas.realizado - despesas.realizado),
  };
}

export interface GastoPorCategoria {
  categoriaId: number | null;
  nome: string;
  valor: number;
  /** 0–100, sobre o total do mês. */
  percentual: number;
}

/** Onde o dinheiro vai: despesas do mês (exceto canceladas) somadas por categoria, da maior para a menor. */
export function gastosPorCategoria(pagar: ContaFinanceira[]): GastoPorCategoria[] {
  const grupos = new Map<number | null, { nome: string; valor: number }>();
  let total = 0;
  for (const c of pagar) {
    if (situacaoDaConta(c) === 'cancelada') continue;
    const chave = c.categoriaId ?? null;
    const atual = grupos.get(chave) ?? { nome: c.categoriaNome ?? 'Sem categoria', valor: 0 };
    atual.valor += c.valor ?? 0;
    grupos.set(chave, atual);
    total += c.valor ?? 0;
  }
  return [...grupos.entries()]
    .map(([categoriaId, g]) => ({
      categoriaId,
      nome: g.nome,
      valor: arredondar(g.valor),
      percentual: total > 0 ? (g.valor / total) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}
