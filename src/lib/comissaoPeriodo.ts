import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, getDay, parseISO, startOfMonth } from 'date-fns';

const ISO = 'yyyy-MM-dd';

export interface PeriodoComissao {
  /** Primeiro dia do período (o dia seguinte ao fechamento anterior). */
  inicio: string;
  /** Dia de fechamento do mês (limitado ao último dia do mês, como no backend). */
  fim: string;
  /** Quinto dia útil do mês seguinte ao fechamento: quando o funcionário recebe. */
  pagamentoPrevisto: string;
}

/** Dia de fechamento efetivo num mês — dia 31 em fevereiro vira o último dia de fevereiro. */
function fechamentoDoMes(mes: Date, diaFechamento: number): Date {
  const ultimo = endOfMonth(mes).getDate();
  return new Date(mes.getFullYear(), mes.getMonth(), Math.min(diaFechamento, ultimo));
}

/**
 * Quinto dia útil do mês (segunda a sexta). Feriados não entram na conta: o backend não tem calendário de
 * feriados, então a data é uma previsão que o financeiro confirma ao pagar.
 */
export function quintoDiaUtil(mes: Date): Date {
  let dia = startOfMonth(mes);
  let uteis = 0;
  for (;;) {
    const semana = getDay(dia);
    if (semana !== 0 && semana !== 6) uteis += 1;
    if (uteis === 5) return dia;
    dia = addDays(dia, 1);
  }
}

/** Período de comissão que termina no dia de fechamento do mês de `mesFim`. */
export function periodoDoMes(mesFim: Date, diaFechamento: number): PeriodoComissao {
  const fim = fechamentoDoMes(mesFim, diaFechamento);
  const fechamentoAnterior = fechamentoDoMes(addMonths(mesFim, -1), diaFechamento);
  return {
    inicio: format(addDays(fechamentoAnterior, 1), ISO),
    fim: format(fim, ISO),
    pagamentoPrevisto: format(quintoDiaUtil(addMonths(mesFim, 1)), ISO),
  };
}

/** Período em andamento hoje: passou do dia de fechamento do mês, já estamos no período que fecha no mês seguinte. */
export function periodoAtual(hoje: Date, diaFechamento: number): PeriodoComissao {
  const noMesCorrente = fechamentoDoMes(hoje, diaFechamento);
  const mesFim = differenceInCalendarDays(hoje, noMesCorrente) > 0 ? addMonths(hoje, 1) : hoje;
  return periodoDoMes(mesFim, diaFechamento);
}

/** Os `quantidade` períodos mais recentes (o atual primeiro), para o seletor da tela. */
export function ultimosPeriodos(hoje: Date, diaFechamento: number, quantidade = 12): PeriodoComissao[] {
  const atual = parseISO(periodoAtual(hoje, diaFechamento).fim);
  return Array.from({ length: quantidade }, (_, i) => periodoDoMes(addMonths(atual, -i), diaFechamento));
}
