import { useFormContext } from 'react-hook-form';
import { Gauge } from 'lucide-react';
import { useHoraTecnica } from '@/hooks/useHoraTecnica';
import { formatCurrency, formatMinutosParaHoras } from '@/lib/formatters';
import { somarTempoVendidoMinutos, type ItemFormValue } from './ItemsEditor';

/**
 * O valor final da hora técnica (PHT) como referência pra quem monta o
 * Orçamento/OS, com a mão de obra que o tempo vendido representa a esse
 * preço. Só o número final — a composição (custos, margem) nunca chega a
 * quem não gerencia, o backend já a redige.
 *
 * Puramente informativo: não altera preço de item nenhum (preço só muda via
 * fluxo de desconto — ver ItemsEditor). Sem hora técnica configurada, ou sem
 * permissão pra consultá-la, simplesmente não aparece.
 */
export function HoraTecnicaReferencia({ name }: { name: string }) {
  const { data } = useHoraTecnica({ silentError: true });
  const { watch } = useFormContext();
  const items: ItemFormValue[] = watch(name) ?? [];

  const pht = data?.precoHoraTecnica;
  if (!data?.configurado || pht == null) return null;

  const tempoMinutos = somarTempoVendidoMinutos(items);
  const maoDeObra = (tempoMinutos / 60) * pht;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-2.5 text-sm dark:border-brand-900/60 dark:bg-brand-900/20">
      <span className="flex items-center gap-2 text-ink-muted">
        <Gauge size={16} className="text-brand-600 dark:text-brand-300" />
        Hora técnica <strong className="text-ink">{formatCurrency(pht)}/h</strong>
      </span>
      {tempoMinutos > 0 && (
        <span className="text-ink-muted">
          Mão de obra de referência ({formatMinutosParaHoras(tempoMinutos)}):{' '}
          <strong className="text-ink">{formatCurrency(maoDeObra)}</strong>
        </span>
      )}
    </div>
  );
}
