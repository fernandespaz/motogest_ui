import { Activity, Clock, Gauge, Hourglass, Timer, Wallet } from 'lucide-react';
import clsx from 'clsx';
import type { IndicadoresProdutividadeResponse, ProdutividadeDiariaResponse } from '@/api/types';
import {
  formatCurrency,
  formatDate,
  formatMinutosEmHorasDecimais as horasTecnicas,
  formatPercent,
  mesReferenciaAtual,
} from '@/lib/formatters';
import { GradeIndicadores, type Indicador } from './IndicadoresConsultor';

export function montarIndicadoresMecanico(ind: IndicadoresProdutividadeResponse): Indicador[] {
  return [
    {
      chave: 'vendidas',
      icon: Clock,
      titulo: 'Horas técnicas vendidas',
      valor: horasTecnicas(ind.minutosVendidos ?? 0),
      detalhe: `Em ${ind.osConcluidas ?? 0} OS concluída(s)`,
      formula: 'Soma do tempo vendido das OS concluídas/entregues no mês',
    },
    {
      chave: 'consumidas',
      icon: Hourglass,
      titulo: 'Horas técnicas consumidas',
      valor: horasTecnicas(ind.minutosConsumidos ?? 0),
      detalhe: `${ind.osComTempoEstourado ?? 0} OS com tempo estourado`,
      formula: 'Tempo real cronometrado nas OS concluídas no mês',
    },
    {
      chave: 'eficiencia',
      icon: Gauge,
      titulo: 'Eficiência',
      valor: formatPercent(ind.eficienciaPercentual),
      detalhe: 'Acima de 100% = entregou em menos tempo que o vendido',
      formula: 'Horas vendidas ÷ horas consumidas',
      percentual: ind.eficienciaPercentual,
    },
    {
      chave: 'ocupacao',
      icon: Activity,
      titulo: 'Ocupação',
      valor: formatPercent(ind.ocupacaoPercentual),
      detalhe: `${horasTecnicas(ind.minutosTrabalhados ?? 0)} trabalhadas de ${horasTecnicas(ind.minutosDisponiveis)}`,
      formula: 'Horas trabalhadas (cronômetro) ÷ horas disponíveis da jornada',
      percentual: ind.ocupacaoPercentual,
    },
    {
      chave: 'produtividade',
      icon: Timer,
      titulo: 'Produtividade',
      valor: formatPercent(ind.produtividadePercentual),
      detalhe: 'Horas vendidas sobre as horas disponíveis',
      formula: 'Horas vendidas ÷ horas disponíveis (eficiência × ocupação)',
      percentual: ind.produtividadePercentual,
    },
    {
      chave: 'mao-de-obra',
      icon: Wallet,
      titulo: 'Mão de obra',
      valor: formatCurrency(ind.valorMaoDeObra),
      detalhe: `${ind.quantidadePausas ?? 0} pausa(s) · ${horasTecnicas(ind.minutosPausados ?? 0)} pausado`,
      formula: 'Valor dos serviços das OS concluídas no mês',
    },
  ];
}

export function IndicadoresMecanicoGrid({
  indicadores,
  atualizando,
}: {
  indicadores: IndicadoresProdutividadeResponse;
  atualizando?: boolean;
}) {
  return (
    <GradeIndicadores
      itens={montarIndicadoresMecanico(indicadores)}
      atualizando={atualizando}
      className="lg:grid-cols-3 2xl:grid-cols-6"
    />
  );
}

/** Selo "Ao vivo" — só no mês corrente, que é o único reconsultado periodicamente (ver useProdutividade). */
export function AoVivoBadge({ mes, atualizando }: { mes: string; atualizando?: boolean }) {
  if (mes !== mesReferenciaAtual()) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success dark:bg-green-900/20"
      title="Atualiza sozinho a cada 30 segundos"
    >
      <span className={clsx('h-2 w-2 rounded-full bg-success', atualizando ? 'animate-ping' : 'animate-pulse')} />
      Ao vivo
    </span>
  );
}

/**
 * Horas trabalhadas por dia do mês — uma série só (sem legenda); o valor
 * exato aparece no hover de cada barra e a tabela de OS abaixo é a leitura
 * tabular do mesmo mês.
 */
export function HorasPorDiaChart({ dias }: { dias: ProdutividadeDiariaResponse[] }) {
  const maximo = Math.max(60, ...dias.map((d) => d.minutosTrabalhados ?? 0));
  if (dias.length === 0) return <p className="px-5 pb-5 text-sm text-ink-muted">Nenhuma hora registrada neste mês.</p>;

  return (
    <div className="px-4 pb-5 sm:px-5">
      <div className="flex h-40 items-end gap-[2px]" role="list" aria-label="Horas trabalhadas por dia">
        {dias.map((d) => {
          const minutos = d.minutosTrabalhados ?? 0;
          const rotulo = `${formatDate(d.data)}: ${horasTecnicas(minutos)}`;
          return (
            <div key={d.data} role="listitem" aria-label={rotulo} title={rotulo} className="group flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-brand-500 transition-colors group-hover:bg-brand-700"
                style={{ height: `${(minutos / maximo) * 100}%`, minHeight: minutos > 0 ? 2 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink-muted">
        <span>{formatDate(dias[0].data)}</span>
        <span>máx. {horasTecnicas(maximo)}/dia</span>
        <span>{formatDate(dias[dias.length - 1].data)}</span>
      </div>
    </div>
  );
}
