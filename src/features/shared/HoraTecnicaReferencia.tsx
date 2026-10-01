import { useFormContext } from 'react-hook-form';
import { Gauge } from 'lucide-react';
import { useCategoriasHoraTecnica } from '@/hooks/useHoraTecnica';
import { formatCurrency, formatMinutosParaHoras } from '@/lib/formatters';
import { somarTempoVendidoMinutos, type ItemFormValue } from './ItemsEditor';

/**
 * Mão de obra pela hora técnica dos itens já lançados, pra quem monta o
 * Orçamento/OS. Cada item já carrega o preço calculado pela categoria do
 * VEÍCULO do orçamento/OS (valorHora × tempo, ver ItemsEditor — não mais pela
 * categoria do serviço escolhido) — aqui só soma o que já está na tela, sem
 * recalcular nada. A composição (custos, margem) nunca chega a quem não
 * gerencia, o backend já a redige.
 *
 * Puramente informativo: não altera preço de item nenhum (preço só muda via
 * fluxo de desconto — ver ItemsEditor). Sem nenhuma categoria configurada, ou
 * sem permissão pra consultá-la, ou sem nenhum item cobrado por hora
 * técnica ainda, simplesmente não aparece.
 */
export function HoraTecnicaReferencia({ name }: { name: string }) {
  const { data: categorias } = useCategoriasHoraTecnica({ silentError: true });
  const { watch } = useFormContext();
  const items: ItemFormValue[] = watch(name) ?? [];

  if (!categorias || categorias.length === 0) return null;

  const itensPorHT = items.filter((item) => item.tipoItem === 'SERVICO' && item.precificadoPorHT);
  const tempoMinutos = somarTempoVendidoMinutos(itensPorHT);
  if (tempoMinutos <= 0) return null;

  const maoDeObra = itensPorHT.reduce(
    (soma, item) => soma + (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0),
    0,
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-2.5 text-sm dark:border-brand-900/60 dark:bg-brand-900/20">
      <span className="flex items-center gap-2 text-ink-muted">
        <Gauge size={16} className="text-brand-600 dark:text-brand-300" />
        Mão de obra pela hora técnica ({formatMinutosParaHoras(tempoMinutos)}):{' '}
        <strong className="text-ink">{formatCurrency(maoDeObra)}</strong>
      </span>
    </div>
  );
}
