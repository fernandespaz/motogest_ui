import { useMemo, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { PageSpinner } from '@/components/ui/Spinner';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTodasContasPagar, useTodasContasReceber } from '@/hooks/useFinanceiro';
import { baixarCsv } from '@/lib/csv';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { gastosPorCategoria, noPeriodo, ordenarPorVencimento, situacaoDaConta, type ContaFinanceira } from './contasUtils';

type Relatorio = 'despesas' | 'receitas' | 'contas';

const ROTULO_SITUACAO = {
  vencida: 'Vencida',
  'vence-hoje': 'Vence hoje',
  'a-vencer': 'A vencer',
  quitada: 'Quitada',
  cancelada: 'Cancelada',
} as const;

type ContaDoRelatorio = ContaFinanceira & { descricao?: string; fornecedor?: string; clienteNome?: string; dataPagamento?: string; dataRecebimento?: string };

/**
 * Relatórios do financeiro por período de vencimento, exportáveis em CSV (abre direto no Excel): onde o dinheiro
 * foi (despesas por categoria), de onde veio (receitas por categoria) e a lista completa de contas do período.
 * Calculado no navegador a partir das contas já carregadas — não há endpoint específico.
 */
export function FinanceiroRelatorios() {
  const pagar = useTodasContasPagar();
  const receber = useTodasContasReceber();
  const [inicio, setInicio] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [fim, setFim] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [relatorio, setRelatorio] = useState<Relatorio>('despesas');

  const contasPagar = useMemo(() => noPeriodo((pagar.data ?? []) as ContaDoRelatorio[], inicio, fim), [pagar.data, inicio, fim]);
  const contasReceber = useMemo(() => noPeriodo((receber.data ?? []) as ContaDoRelatorio[], inicio, fim), [receber.data, inicio, fim]);
  const despesas = useMemo(() => gastosPorCategoria(contasPagar), [contasPagar]);
  const receitas = useMemo(() => gastosPorCategoria(contasReceber), [contasReceber]);
  const lista = useMemo(
    () => ordenarPorVencimento([...contasPagar.map((c) => ({ ...c, tipo: 'A pagar' })), ...contasReceber.map((c) => ({ ...c, tipo: 'A receber' }))]),
    [contasPagar, contasReceber],
  );

  if (pagar.isLoading || receber.isLoading) return <PageSpinner label="Carregando relatórios..." />;

  const periodoValido = !!inicio && !!fim && inicio <= fim;
  const nomeArquivo = `financeiro-${relatorio}-${inicio}-a-${fim}`;
  const categorias = relatorio === 'despesas' ? despesas : receitas;
  const totalCategorias = categorias.reduce((soma, c) => soma + c.valor, 0);

  function exportar() {
    if (relatorio === 'contas') {
      baixarCsv(nomeArquivo, [
        ['Tipo', 'Descrição', 'Fornecedor / Cliente', 'Categoria', 'Vencimento', 'Valor', 'Situação', 'Valor pago', 'Data da baixa'],
        ...lista.map((c) => [
          c.tipo,
          c.descricao,
          c.fornecedor ?? c.clienteNome,
          c.categoriaNome ?? 'Sem categoria',
          c.dataVencimento ? formatDate(c.dataVencimento) : '',
          c.valor,
          ROTULO_SITUACAO[situacaoDaConta(c)],
          c.valorPago,
          c.dataPagamento ?? c.dataRecebimento ? formatDate(c.dataPagamento ?? c.dataRecebimento) : '',
        ]),
      ]);
      return;
    }
    baixarCsv(nomeArquivo, [
      ['Categoria', 'Valor', '% do total'],
      ...categorias.map((c) => [c.nome, c.valor, Number(c.percentual.toFixed(1))]),
      ['Total', totalCategorias, 100],
    ]);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <Input label="Vencimento de" type="date" value={inicio} max={fim || undefined} onChange={(e) => setInicio(e.target.value)} />
          <Input label="até" type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
          <SegmentedControl<Relatorio>
            value={relatorio}
            onChange={setRelatorio}
            options={[
              { value: 'despesas', label: 'Despesas por categoria' },
              { value: 'receitas', label: 'Receitas por categoria' },
              { value: 'contas', label: 'Contas do período' },
            ]}
          />
          <div className="ml-auto">
            <Button variant="secondary" onClick={exportar} disabled={!periodoValido || (relatorio === 'contas' ? lista.length === 0 : categorias.length === 0)}>
              Exportar CSV
            </Button>
          </div>
        </CardBody>
      </Card>

      {!periodoValido ? (
        <p className="text-sm text-ink-muted">Informe um período válido (a data final não pode ser anterior à inicial).</p>
      ) : relatorio === 'contas' ? (
        <Card>
          <CardHeader title="Contas do período" subtitle={`${lista.length} ${lista.length === 1 ? 'conta' : 'contas'} com vencimento entre ${formatDate(inicio)} e ${formatDate(fim)}`} />
          {lista.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-ink-muted">Nenhuma conta neste período.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((c, i) => (
                <li key={`${c.tipo}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
                  <span className="w-24 shrink-0 text-ink-muted">{formatDate(c.dataVencimento)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{c.descricao}</span>
                  <span className="text-ink-muted">{c.tipo}</span>
                  <span className="text-ink-muted">{ROTULO_SITUACAO[situacaoDaConta(c)]}</span>
                  <span className="w-28 shrink-0 text-right font-semibold text-ink">{formatCurrency(c.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader
            title={relatorio === 'despesas' ? 'Despesas por categoria' : 'Receitas por categoria'}
            subtitle={`Contas com vencimento entre ${formatDate(inicio)} e ${formatDate(fim)}, sem as canceladas`}
          />
          {categorias.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-ink-muted">Nenhuma conta neste período.</p>
          ) : (
            <ul className="divide-y divide-border">
              {categorias.map((c) => (
                <li key={c.categoriaId ?? 'sem'} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                  <span className={c.categoriaId == null ? 'min-w-0 flex-1 truncate text-warning' : 'min-w-0 flex-1 truncate text-ink'}>{c.nome}</span>
                  <span className="w-14 shrink-0 text-right text-ink-muted">{Math.round(c.percentual)}%</span>
                  <span className="w-28 shrink-0 text-right font-semibold text-ink">{formatCurrency(c.valor)}</span>
                </li>
              ))}
              <li className="flex items-center gap-4 bg-surface-alt px-5 py-3 text-sm font-semibold text-ink">
                <span className="flex-1">Total</span>
                <span className="w-28 shrink-0 text-right">{formatCurrency(totalCategorias)}</span>
              </li>
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
