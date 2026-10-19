import { addDays, format, parseISO } from 'date-fns';
import { formatDate } from './formatters';

/** Primeira data aceita depois da data muro (o dia seguinte ao último fechamento), no formato do `<input type="date">`. */
export function minimoAposMuro(dataMuro?: string): string | undefined {
  return dataMuro ? format(addDays(parseISO(dataMuro), 1), 'yyyy-MM-dd') : undefined;
}

/** Mensagem de erro quando a data cai em período fechado; `undefined` se a data é livre. */
export function erroDePeriodoFechado(data: string, dataMuro?: string): string | undefined {
  return dataMuro && data <= dataMuro ? `O financeiro está fechado até ${formatDate(dataMuro)}` : undefined;
}
