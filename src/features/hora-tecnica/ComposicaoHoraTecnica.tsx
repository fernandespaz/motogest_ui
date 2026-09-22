import { motion } from 'framer-motion';
import { ArrowRight, Calculator, Clock, Coins, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import type { HoraTecnicaResponse } from '@/api/types';
import { formatCurrency, formatHorasDecimais, formatPercent } from '@/lib/formatters';

function Etapa({
  icon: Icon,
  sigla,
  titulo,
  valor,
  explicacao,
  destaque,
  index,
}: {
  icon: LucideIcon;
  sigla: string;
  titulo: string;
  valor: string;
  explicacao: string;
  destaque?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={
        destaque
          ? 'flex flex-1 flex-col gap-1.5 rounded-2xl bg-brand-600 p-4 text-white shadow-card'
          : 'flex flex-1 flex-col gap-1.5 rounded-2xl border border-border bg-surface p-4 shadow-card'
      }
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className={destaque ? 'text-brand-100' : 'text-brand-600 dark:text-brand-300'} />
        <span className={destaque ? 'text-xs font-semibold text-brand-100' : 'text-xs font-semibold text-ink-muted'}>
          {sigla} · {titulo}
        </span>
      </div>
      <p className={destaque ? 'text-2xl font-bold tracking-tight' : 'text-xl font-semibold tracking-tight text-ink'}>
        {valor}
      </p>
      <p className={destaque ? 'text-xs text-brand-100' : 'text-xs text-ink-muted'}>{explicacao}</p>
    </motion.div>
  );
}

function Seta() {
  return (
    <div className="hidden items-center justify-center text-ink-muted lg:flex" aria-hidden>
      <ArrowRight size={18} />
    </div>
  );
}

/**
 * O cálculo da hora técnica como uma esteira de 4 etapas — CF → HP → CH → PHT
 * — pra que o administrador veja de onde sai o número que o consultor usa.
 * Os valores vêm prontos do backend; aqui só se apresenta.
 */
export function ComposicaoHoraTecnica({ horaTecnica }: { horaTecnica: HoraTecnicaResponse }) {
  const c = horaTecnica.composicao;
  if (!c) return null;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
      <Etapa
        index={0}
        icon={Coins}
        sigla="CF"
        titulo="Despesas fixas"
        valor={formatCurrency(c.custosFixos)}
        explicacao={`${c.itensCustoFixo?.length ?? 0} item(ns) por mês`}
      />
      <Seta />
      <Etapa
        index={1}
        icon={Clock}
        sigla="HP"
        titulo="Horas produtivas"
        valor={formatHorasDecimais(c.horasProdutivas)}
        explicacao={`${c.numeroMecanicos ?? 0} mecânico(s) × ${c.horasPorDia ?? 0} h × ${c.diasUteisMes ?? 0} dias × ${formatPercent(c.eficienciaPercentual)}`}
      />
      <Seta />
      <Etapa
        index={2}
        icon={Calculator}
        sigla="CH"
        titulo="Custo por hora"
        valor={c.custoPorHora == null ? '—' : formatCurrency(c.custoPorHora)}
        explicacao="Despesas fixas ÷ horas produtivas"
      />
      <Seta />
      <Etapa
        index={3}
        icon={Tag}
        sigla="PHT"
        titulo="Preço da hora técnica"
        valor={horaTecnica.precoHoraTecnica == null ? '—' : formatCurrency(horaTecnica.precoHoraTecnica)}
        explicacao={`CH ÷ (1 − (${formatPercent(c.impostosPercentual)} impostos + ${formatPercent(c.margemLucroPercentual)} margem))`}
        destaque
      />
    </div>
  );
}

/** Cartão compacto quando ainda não há parâmetros — orienta o próximo passo em vez de mostrar zeros. */
export function HoraTecnicaNaoConfigurada() {
  return (
    <Card>
      <CardBody className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-warning dark:bg-amber-900/30">
          <Calculator size={20} />
        </div>
        <div>
          <p className="font-medium text-ink">Hora técnica ainda não configurada</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            Cadastre as despesas fixas mensais (em Financeiro) e preencha os parâmetros abaixo. Assim que os dois existirem, o preço da
            hora técnica é calculado e passa a aparecer para os consultores nos orçamentos e OS.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
