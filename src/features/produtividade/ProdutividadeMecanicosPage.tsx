import { useNavigate } from 'react-router-dom';
import { ChevronRight, Wrench } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageSpinner } from '@/components/ui/Spinner';
import { useProdutividadeMecanicos } from '@/hooks/useProdutividade';
import type { ProdutividadeMecanicoResponse } from '@/api/types';
import { formatCurrency, formatMesReferencia, formatPercent, getInitials, formatMinutosEmHorasDecimais as horasTecnicas } from '@/lib/formatters';
import { BarraPercentual, MesSelector } from './IndicadoresConsultor';
import { AoVivoBadge, IndicadoresMecanicoGrid } from './IndicadoresMecanico';
import { ProdutividadeAbas } from './ProdutividadeAbas';
import { useMesReferencia } from './useMesReferencia';

function CelulaPercentual({ valor }: { valor: number | undefined | null }) {
  return (
    <div className="flex min-w-[6rem] flex-col gap-1">
      <span className="font-medium text-ink">{formatPercent(valor)}</span>
      <BarraPercentual valor={valor} />
    </div>
  );
}

/** Pressupõe PRODUTIVIDADE_READ — o gate fica na rota (ver router.tsx). */
export function ProdutividadeMecanicosPage() {
  const navigate = useNavigate();
  const [mes, setMes] = useMesReferencia();
  const { data, isLoading, isPlaceholderData, isFetching } = useProdutividadeMecanicos(mes);

  const colunas: Column<ProdutividadeMecanicoResponse>[] = [
    {
      header: 'Mecânico',
      render: (m) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            {getInitials(m.usuarioNome ?? '')}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{m.usuarioNome}</p>
            <p className="text-xs text-ink-muted">{m.indicadores?.osConcluidas ?? 0} OS concluída(s)</p>
          </div>
        </div>
      ),
    },
    { header: 'HT vendidas', render: (m) => horasTecnicas(m.indicadores?.minutosVendidos ?? 0) },
    { header: 'HT consumidas', render: (m) => horasTecnicas(m.indicadores?.minutosConsumidos ?? 0), hideBelow: 'md' },
    { header: 'Eficiência', render: (m) => <CelulaPercentual valor={m.indicadores?.eficienciaPercentual} />, hideBelow: 'sm' },
    { header: 'Ocupação', render: (m) => <CelulaPercentual valor={m.indicadores?.ocupacaoPercentual} />, hideBelow: 'lg' },
    { header: 'Produtividade', render: (m) => <CelulaPercentual valor={m.indicadores?.produtividadePercentual} /> },
    {
      header: 'Mão de obra',
      render: (m) => <span className="font-semibold text-ink">{formatCurrency(m.indicadores?.valorMaoDeObra)}</span>,
      className: 'text-right',
      hideBelow: 'md',
    },
    { header: '', render: () => <ChevronRight size={16} className="text-ink-muted" />, className: 'w-8' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Produtividade"
        subtitle="Horas técnicas dos mecânicos, calculadas a partir do cronômetro das ordens de serviço"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AoVivoBadge mes={mes} atualizando={isFetching && !isLoading} />
            <MesSelector mes={mes} onChange={setMes} />
          </div>
        }
      />
      <ProdutividadeAbas ativa="mecanicos" mes={mes} />

      {isLoading || !data ? (
        <PageSpinner label="Calculando indicadores..." />
      ) : (
        <>
          <section aria-label="Total da oficina" className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Total da oficina</h2>
            <IndicadoresMecanicoGrid indicadores={data.totalOficina ?? {}} atualizando={isPlaceholderData} />
          </section>

          <Card>
            <CardHeader
              title="Mecânicos"
              subtitle={`${formatMesReferencia(mes)} · ${horasTecnicas(data.minutosDisponiveisPorMecanico)} disponíveis por mecânico · clique para ver o detalhe`}
            />
            <div className={clsx('transition-opacity', isPlaceholderData && 'opacity-60')}>
              <DataTable
                columns={colunas}
                rows={data.mecanicos ?? []}
                rowKey={(m) => m.usuarioId!}
                emptyIcon={Wrench}
                emptyTitle="Nenhum mecânico com movimento neste mês"
                emptyDescription="Assim que um técnico iniciar o cronômetro de uma OS, os números aparecem aqui."
                onRowClick={(m) => navigate(`/produtividade/mecanicos/${m.usuarioId}?mes=${mes}`)}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
