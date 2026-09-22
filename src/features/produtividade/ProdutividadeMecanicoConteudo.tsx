import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import clsx from 'clsx';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { useAuthStore } from '@/store/authStore';
import type { OrdemServicoProdutividadeResponse, ProdutividadeMecanicoDetalheResponse } from '@/api/types';
import { formatCurrency, formatDateTime, formatMesReferencia, formatPercent, formatMinutosEmHorasDecimais as horasTecnicas } from '@/lib/formatters';
import { HorasPorDiaChart, IndicadoresMecanicoGrid } from './IndicadoresMecanico';

/**
 * Corpo do detalhe mensal de um mecânico — o mesmo pra visão do administrador
 * (/produtividade/mecanicos/:id) e pra do próprio mecânico
 * (/minha-produtividade). Só o cabeçalho e a origem do usuarioId mudam.
 */
export function ProdutividadeMecanicoConteudo({
  data,
  mes,
  atualizando,
  linkOsBase = '/ordens-servico',
}: {
  data: ProdutividadeMecanicoDetalheResponse;
  mes: string;
  atualizando?: boolean;
  /** O mecânico abre a OS pela própria tela (/minhas-os/:id), não pela do consultor. */
  linkOsBase?: string;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const podeAbrirOs = hasPermission('ORDEM_SERVICO_READ');

  const colunas: Column<OrdemServicoProdutividadeResponse>[] = [
    {
      header: 'OS',
      render: (o) =>
        podeAbrirOs ? (
          <Link to={`${linkOsBase}/${o.id}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
            {o.numero ?? `#${o.id}`}
          </Link>
        ) : (
          <span className="font-semibold text-ink">{o.numero ?? `#${o.id}`}</span>
        ),
    },
    { header: 'Conclusão', render: (o) => formatDateTime(o.dataConclusao), hideBelow: 'md' },
    { header: 'HT vendidas', render: (o) => horasTecnicas(o.minutosVendidos) },
    { header: 'HT consumidas', render: (o) => horasTecnicas(o.minutosConsumidos), hideBelow: 'sm' },
    {
      header: 'Eficiência',
      render: (o) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{formatPercent(o.eficienciaPercentual)}</span>
          {o.tempoEstourado && <Badge tone="danger">Estourou</Badge>}
        </div>
      ),
    },
    {
      header: 'Mão de obra',
      render: (o) => <span className="font-medium text-ink">{formatCurrency(o.valorMaoDeObra)}</span>,
      className: 'text-right',
      hideBelow: 'sm',
    },
  ];

  return (
    <div className={clsx('flex flex-col gap-5 transition-opacity', atualizando && 'opacity-60')}>
      <IndicadoresMecanicoGrid indicadores={data.indicadores ?? {}} />

      <Card>
        <CardHeader title="Horas trabalhadas por dia" subtitle={formatMesReferencia(mes)} />
        <HorasPorDiaChart dias={data.horasPorDia ?? []} />
      </Card>

      <Card>
        <CardHeader
          title="OS concluídas no mês"
          subtitle="Horas técnicas vendidas × consumidas em cada ordem de serviço"
        />
        <DataTable
          columns={colunas}
          rows={data.ordensConcluidas ?? []}
          rowKey={(o) => o.id!}
          emptyIcon={Wrench}
          emptyTitle="Nenhuma OS concluída neste mês"
        />
      </Card>
    </div>
  );
}
