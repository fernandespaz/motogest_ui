import { useMemo, useState } from 'react';
import { addMonths, differenceInCalendarDays, format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DonutChart } from '@/components/ui/DonutChart';
import { PageSpinner } from '@/components/ui/Spinner';
import { useParametrosFinanceiros, useTodasContasPagar, useTodasContasReceber } from '@/hooks/useFinanceiro';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  balancoDoMes,
  doMes,
  gastosPorCategoria,
  periodoDeFechamento,
  ordenarPorVencimento,
  resumirPorSituacao,
  situacaoDaConta,
  type BalancoDoMes,
  type ContaBase,
  type GastoPorCategoria,
  type ResumoContas,
  type SituacaoConta,
} from './contasUtils';
import { VencimentoInfo } from './VencimentoInfo';
import type { TipoConta } from './ContaFormModal';

const MAX_LINHAS = 8;
const MAX_CATEGORIAS = 8;

export type DestinoFinanceiro = { aba: TipoConta; situacao?: SituacaoConta };

function emAberto(resumo: ResumoContas) {
  const quantidade = resumo.vencida.quantidade + resumo['vence-hoje'].quantidade + resumo['a-vencer'].quantidade;
  const valor = resumo.vencida.valor + resumo['vence-hoje'].valor + resumo['a-vencer'].valor;
  return { quantidade, valor };
}

export function FinanceiroVisaoGeral({ onIrPara }: { onIrPara: (destino: DestinoFinanceiro) => void }) {
  const pagar = useTodasContasPagar();
  const receber = useTodasContasReceber();
  const parametros = useParametrosFinanceiros();
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const anoMes = format(mes, 'yyyy-MM');
  const ehMesAtual = anoMes === format(new Date(), 'yyyy-MM');

  const contasPagar = useMemo(() => doMes(pagar.data ?? [], anoMes), [pagar.data, anoMes]);
  const contasReceber = useMemo(() => doMes(receber.data ?? [], anoMes), [receber.data, anoMes]);
  const resumoPagar = useMemo(() => resumirPorSituacao(contasPagar), [contasPagar]);
  const resumoReceber = useMemo(() => resumirPorSituacao(contasReceber), [contasReceber]);

  const balanco = useMemo(() => balancoDoMes(contasReceber, contasPagar), [contasReceber, contasPagar]);
  const gastos = useMemo(() => gastosPorCategoria(contasPagar), [contasPagar]);

  const proximos = useMemo(() => {
    const doTipo = (tipo: TipoConta, contas: ContaBase[] & { descricao?: string }[]) =>
      contas
        .filter((c) => {
          const situacao = situacaoDaConta(c);
          return situacao === 'vencida' || situacao === 'vence-hoje' || situacao === 'a-vencer';
        })
        .map((c) => ({ tipo, conta: c as ContaBase & { id?: number; descricao?: string; fornecedor?: string; clienteNome?: string } }));
    const todos = [...doTipo('pagar', contasPagar), ...doTipo('receber', contasReceber)];
    const ordenados = ordenarPorVencimento(todos.map((t) => ({ ...t, dataVencimento: t.conta.dataVencimento })));
    return ordenados;
  }, [contasPagar, contasReceber]);

  if (pagar.isLoading || receber.isLoading) return <PageSpinner label="Carregando financeiro..." />;

  const vencidasPagar = resumoPagar.vencida;
  const vencidasReceber = resumoReceber.vencida;
  const totalVencidas = vencidasPagar.quantidade + vencidasReceber.quantidade;
  const valorVencidas = vencidasPagar.valor + vencidasReceber.valor;
  const abertoPagar = emAberto(resumoPagar);
  const abertoReceber = emAberto(resumoReceber);
  const resultado = abertoReceber.valor - abertoPagar.valor;

  const irParaVencidas = () =>
    onIrPara({ aba: vencidasPagar.quantidade > 0 ? 'pagar' : 'receber', situacao: 'vencida' });

  return (
    <div className="flex flex-col gap-5">
      <SeletorMes mes={mes} ehMesAtual={ehMesAtual} onChange={setMes} />
      {ehMesAtual && parametros.data?.diaFechamento != null && <AvisoFechamento dia={parametros.data.diaFechamento} />}
      <BalancoCard balanco={balanco} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          icon={totalVencidas > 0 ? AlertTriangle : CheckCircle2}
          rotulo="Contas vencidas"
          valor={totalVencidas > 0 ? String(totalVencidas) : 'Tudo em dia'}
          detalhe={
            totalVencidas > 0
              ? `${formatCurrency(valorVencidas)} · ${vencidasPagar.quantidade} a pagar · ${vencidasReceber.quantidade} a receber`
              : 'Nenhuma conta vencida no mês'
          }
          tom={totalVencidas > 0 ? 'danger' : 'success'}
          destaque={totalVencidas > 0}
          onClick={totalVencidas > 0 ? irParaVencidas : undefined}
        />
        <Indicador
          icon={ArrowDownCircle}
          rotulo="A pagar em aberto"
          valor={formatCurrency(abertoPagar.valor)}
          detalhe={`${abertoPagar.quantidade} ${abertoPagar.quantidade === 1 ? 'conta' : 'contas'}`}
          tom="danger"
          onClick={() => onIrPara({ aba: 'pagar' })}
        />
        <Indicador
          icon={ArrowUpCircle}
          rotulo="A receber em aberto"
          valor={formatCurrency(abertoReceber.valor)}
          detalhe={`${abertoReceber.quantidade} ${abertoReceber.quantidade === 1 ? 'conta' : 'contas'}`}
          tom="success"
          onClick={() => onIrPara({ aba: 'receber' })}
        />
        <Indicador
          icon={Scale}
          rotulo="Resultado previsto"
          valor={formatCurrency(resultado)}
          detalhe="a receber − a pagar, em aberto"
          tom={resultado < 0 ? 'danger' : 'success'}
        />
      </div>

      <GastosPorCategoria gastos={gastos} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GraficoContas tipo="pagar" titulo="Contas a pagar" resumo={resumoPagar} onIrPara={onIrPara} />
        <GraficoContas tipo="receber" titulo="Contas a receber" resumo={resumoReceber} onIrPara={onIrPara} />
      </div>

      <Card>
        <CardHeader title="Vencimentos do mês" subtitle="Contas em aberto com vencimento no mês, da mais antiga para a mais nova" />
        {proximos.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-ink-muted">Nenhuma conta em aberto com vencimento neste mês.</p>
        ) : (
          <ul className="divide-y divide-border">
            {proximos.slice(0, MAX_LINHAS).map(({ tipo, conta }) => (
              <li key={`${tipo}-${conta.id}`}>
                <button
                  type="button"
                  onClick={() => onIrPara({ aba: tipo, situacao: situacaoDaConta(conta) === 'vencida' ? 'vencida' : undefined })}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-surface-alt"
                >
                  <div className="w-28 shrink-0">
                    <VencimentoInfo conta={conta} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{conta.descricao}</p>
                    <p className="truncate text-xs text-ink-muted">{conta.fornecedor ?? conta.clienteNome ?? ''}</p>
                  </div>
                  <span
                    className={clsx(
                      'hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-block',
                      tipo === 'pagar' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
                    )}
                  >
                    {tipo === 'pagar' ? 'A pagar' : 'A receber'}
                  </span>
                  <span className="w-28 shrink-0 text-right text-sm font-semibold text-ink">{formatCurrency(conta.valor)}</span>
                  <ChevronRight size={16} className="shrink-0 text-ink-muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {proximos.length > MAX_LINHAS && (
          <p className="border-t border-border px-5 py-3 text-sm text-ink-muted">
            + {proximos.length - MAX_LINHAS} {proximos.length - MAX_LINHAS === 1 ? 'conta' : 'contas'} nas abas A pagar e A receber.
          </p>
        )}
      </Card>
    </div>
  );
}

function SeletorMes({ mes, ehMesAtual, onChange }: { mes: Date; ehMesAtual: boolean; onChange: (mes: Date) => void }) {
  const rotulo = format(mes, "MMMM 'de' yyyy", { locale: ptBR });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-surface px-1.5 py-1">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => onChange(addMonths(mes, -1))}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <span className="flex min-w-48 items-center justify-center gap-2 px-2 text-sm font-semibold capitalize text-ink" aria-live="polite">
          <CalendarDays size={16} className="text-brand-600" aria-hidden="true" />
          {rotulo}
        </span>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => onChange(addMonths(mes, 1))}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      {ehMesAtual ? (
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">Mês atual</span>
      ) : (
        <button
          type="button"
          onClick={() => onChange(startOfMonth(new Date()))}
          className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
        >
          Voltar ao mês atual
        </button>
      )}
      <span className="text-xs text-ink-muted">Contas com vencimento neste mês</span>
    </div>
  );
}

function AvisoFechamento({ dia }: { dia: number }) {
  const { inicio, fim } = periodoDeFechamento(dia);
  const faltam = differenceInCalendarDays(parseISO(fim), new Date());
  const quando = faltam === 0 ? 'hoje' : faltam === 1 ? 'amanhã' : `em ${faltam} dias`;
  return (
    <p className="flex items-center gap-2 rounded-xl border border-border bg-surface-alt px-4 py-2.5 text-sm text-ink-muted">
      <CalendarDays size={16} className="shrink-0 text-brand-600" aria-hidden="true" />
      <span>
        Período de fechamento:{' '}
        <strong className="text-ink">
          {formatDate(inicio)} a {formatDate(fim)}
        </strong>{' '}
        — fecha {quando} (dia {dia}).
      </span>
    </p>
  );
}

function BalancoCard({ balanco }: { balanco: BalancoDoMes }) {
  return (
    <Card>
      <CardHeader title="Balanço do mês" subtitle="Previsto = tudo que vence no mês · Realizado = o que já foi pago ou recebido" />
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-ink-muted">Receitas</p>
          <p className="text-xl font-bold text-ink">{formatCurrency(balanco.receitas.previsto)}</p>
          <p className="text-sm text-ink-muted">{formatCurrency(balanco.receitas.realizado)} recebido</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">Despesas</p>
          <p className="text-xl font-bold text-ink">{formatCurrency(balanco.despesas.previsto)}</p>
          <p className="text-sm text-ink-muted">{formatCurrency(balanco.despesas.realizado)} pago</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">Resultado do mês</p>
          <p className={clsx('text-xl font-bold', balanco.resultadoPrevisto < 0 ? 'text-danger' : 'text-success')}>
            {formatCurrency(balanco.resultadoPrevisto)}
          </p>
          <p className="text-sm text-ink-muted">{formatCurrency(balanco.resultadoRealizado)} realizado</p>
        </div>
      </CardBody>
    </Card>
  );
}

function GastosPorCategoria({ gastos }: { gastos: GastoPorCategoria[] }) {
  return (
    <Card>
      <CardHeader title="Para onde foi o dinheiro" subtitle="Despesas do mês por categoria" />
      <CardBody>
        {gastos.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma despesa com vencimento neste mês.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {gastos.slice(0, MAX_CATEGORIAS).map((g) => (
              <li key={g.categoriaId ?? 'sem'}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={clsx('truncate', g.categoriaId == null ? 'text-warning' : 'text-ink')}>{g.nome}</span>
                  <span className="shrink-0 font-semibold text-ink">
                    {formatCurrency(g.valor)} <span className="font-normal text-ink-muted">· {Math.round(g.percentual)}%</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-alt" aria-hidden="true">
                  <div
                    className={clsx('h-full rounded-full', g.categoriaId == null ? 'bg-warning' : 'bg-brand-500')}
                    style={{ width: `${Math.max(g.percentual, 2)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

const TONS_INDICADOR = {
  danger: { icone: 'bg-red-50 text-danger dark:bg-red-900/30', destaque: 'border-danger/50 bg-danger/5' },
  success: { icone: 'bg-green-50 text-success dark:bg-green-900/30', destaque: '' },
} as const;

function Indicador({
  icon: Icon,
  rotulo,
  valor,
  detalhe,
  tom,
  destaque,
  onClick,
}: {
  icon: LucideIcon;
  rotulo: string;
  valor: string;
  detalhe: string;
  tom: keyof typeof TONS_INDICADOR;
  destaque?: boolean;
  onClick?: () => void;
}) {
  const conteudo = (
    <CardBody className="flex items-start gap-4">
      <div className={clsx('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', TONS_INDICADOR[tom].icone)}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-ink-muted">{rotulo}</p>
        <p className="truncate text-2xl font-bold leading-tight text-ink">{valor}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{detalhe}</p>
      </div>
    </CardBody>
  );
  const classes = clsx('w-full text-left', destaque && TONS_INDICADOR[tom].destaque);
  if (!onClick) return <Card className={classes}>{conteudo}</Card>;
  return (
    <Card className={clsx(classes, 'transition-shadow hover:shadow-md')}>
      <button type="button" onClick={onClick} className="block w-full rounded-2xl text-left focus:outline-none focus:ring-2 focus:ring-brand-400">
        {conteudo}
      </button>
    </Card>
  );
}

function GraficoContas({
  tipo,
  titulo,
  resumo,
  onIrPara,
}: {
  tipo: TipoConta;
  titulo: string;
  resumo: ResumoContas;
  onIrPara: (destino: DestinoFinanceiro) => void;
}) {
  const aberto = emAberto(resumo);
  const exibir = (r: { quantidade: number; valor: number }) => `${formatCurrency(r.valor)} · ${r.quantidade}`;
  return (
    <Card>
      <CardHeader
        title={titulo}
        subtitle="Situação das contas, por valor"
        action={
          <button
            type="button"
            onClick={() => onIrPara({ aba: tipo })}
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
          >
            Ver todas
          </button>
        }
      />
      <CardBody>
        <DonutChart
          centerValue={formatCurrency(aberto.valor)}
          centerLabel="em aberto"
          emptyLabel="Sem contas"
          segments={[
            { label: 'Vencidas', value: resumo.vencida.valor, tone: 'danger', display: exibir(resumo.vencida) },
            { label: 'Vencem hoje', value: resumo['vence-hoje'].valor, tone: 'warning', display: exibir(resumo['vence-hoje']) },
            { label: 'A vencer', value: resumo['a-vencer'].valor, tone: 'brand', display: exibir(resumo['a-vencer']) },
            {
              label: tipo === 'pagar' ? 'Pagas' : 'Recebidas',
              value: resumo.quitada.valor,
              tone: 'success',
              display: exibir(resumo.quitada),
            },
          ]}
        />
      </CardBody>
    </Card>
  );
}
