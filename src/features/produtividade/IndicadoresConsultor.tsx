import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, HeartHandshake, Info, Receipt, Target, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { Card, CardBody } from '@/components/ui/Card';
import type { IndicadoresConsultorResponse } from '@/api/types';
import {
  deslocarMesReferencia,
  formatCurrency,
  formatDuracao,
  formatHorasDecimais,
  formatMesReferencia,
  formatPercent,
  mesReferenciaAtual,
} from '@/lib/formatters';

/** Navegação ‹ mês › — não avança além do mês corrente (não há dado futuro). */
export function MesSelector({ mes, onChange }: { mes: string; onChange: (mes: string) => void }) {
  const noMesAtual = mes >= mesReferenciaAtual();
  const botao =
    'flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-card">
      <button type="button" className={botao} aria-label="Mês anterior" onClick={() => onChange(deslocarMesReferencia(mes, -1))}>
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[9.5rem] text-center text-sm font-semibold text-ink" aria-live="polite">
        {formatMesReferencia(mes)}
      </span>
      <button
        type="button"
        className={botao}
        aria-label="Próximo mês"
        disabled={noMesAtual}
        onClick={() => onChange(deslocarMesReferencia(mes, 1))}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/** Barra fina de 0–100% — o valor em si continua escrito ao lado; a barra só dá a leitura rápida. */
export function BarraPercentual({ valor, className }: { valor: number | undefined | null; className?: string }) {
  const largura = valor == null ? 0 : Math.min(100, Math.max(0, valor));
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-surface-alt', className)} aria-hidden>
      <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${largura}%` }} />
    </div>
  );
}

interface Indicador {
  chave: string;
  icon: LucideIcon;
  titulo: string;
  valor: string;
  detalhe: string;
  formula: string;
  percentual?: number | null;
}

function montarIndicadores(ind: IndicadoresConsultorResponse): Indicador[] {
  return [
    {
      chave: 'tc',
      icon: Target,
      titulo: 'Taxa de conversão',
      valor: formatPercent(ind.taxaConversaoPercentual),
      detalhe: `${ind.orcamentosAprovados ?? 0} de ${ind.orcamentosEmitidos ?? 0} orçamentos aprovados`,
      formula: 'Orçamentos aprovados ÷ orçamentos emitidos no mês',
      percentual: ind.taxaConversaoPercentual,
    },
    {
      chave: 'tm',
      icon: Receipt,
      titulo: 'Ticket médio',
      valor: ind.ticketMedio == null ? '—' : formatCurrency(ind.ticketMedio),
      detalhe: `${formatCurrency(ind.valorFaturado)} em ${ind.servicosFechados ?? 0} serviço(s) fechado(s)`,
      formula: 'Valor total faturado ÷ número de serviços fechados',
    },
    {
      chave: 'tr',
      icon: Timer,
      titulo: 'Tempo médio de resposta',
      valor: formatDuracao(ind.tempoMedioRespostaMinutos),
      detalhe: 'Da entrada do veículo à emissão do orçamento',
      formula: 'Média de (emissão do orçamento − entrada do veículo)',
    },
    {
      chave: 'ph',
      icon: Clock,
      titulo: 'Produtividade (horas)',
      valor: formatPercent(ind.produtividadeHorasPercentual),
      detalhe: `${formatHorasDecimais(ind.horasTecnicasVendidas)} vendidas de ${formatHorasDecimais(ind.horasTecnicasDisponiveis)}`,
      formula: 'Horas técnicas vendidas ÷ horas técnicas disponíveis da oficina',
      percentual: ind.produtividadeHorasPercentual,
    },
    {
      chave: 'if',
      icon: HeartHandshake,
      titulo: 'Índice de fidelização',
      valor: formatPercent(ind.indiceFidelizacaoPercentual),
      detalhe: `${ind.clientesRecorrentes ?? 0} de ${ind.clientesAtendidos ?? 0} clientes recorrentes`,
      formula: 'Clientes recorrentes ÷ clientes atendidos no mês',
      percentual: ind.indiceFidelizacaoPercentual,
    },
  ];
}

export function IndicadoresGrid({
  indicadores,
  atualizando,
}: {
  indicadores: IndicadoresConsultorResponse;
  /** Mês novo carregando com os números anteriores ainda na tela — esmaece em vez de piscar. */
  atualizando?: boolean;
}) {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-5',
        atualizando && 'opacity-60',
      )}
    >
      {montarIndicadores(indicadores).map((ind, index) => (
        <motion.div
          key={ind.chave}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <Card className="h-full">
            <CardBody className="flex h-full flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                  <ind.icon size={18} />
                </div>
                <span title={ind.formula} aria-label={`Como é calculado: ${ind.formula}`} className="text-ink-muted">
                  <Info size={14} />
                </span>
              </div>
              <p className="text-xs font-medium text-ink-muted">{ind.titulo}</p>
              <p className="text-2xl font-semibold tracking-tight text-ink">{ind.valor}</p>
              {ind.percentual !== undefined && <BarraPercentual valor={ind.percentual} />}
              <p className="mt-auto text-xs text-ink-muted">{ind.detalhe}</p>
            </CardBody>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
