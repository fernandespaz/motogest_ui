import type { LucideIcon } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { formatCurrency, formatMinutosParaHoras } from '@/lib/formatters';
import type { ItemResponse } from '@/api/types';

/** Lista de itens somente-leitura pro resumo operacional da OS (perfil Mecânico) —
 *  ao contrário de ItemsEditor, não depende de react-hook-form: só exibe o que já
 *  está salvo, sem nenhum controle de edição. */
export function OSItemsSummary({ title, icon: Icon, itens }: { title: string; icon: LucideIcon; itens: ItemResponse[] }) {
  if (itens.length === 0) return null;
  return (
    <Card>
      <CardBody>
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon size={16} className="text-brand-600" /> {title}
        </p>
        <div className="flex flex-col divide-y divide-border">
          {itens.map((item, i) => (
            <div key={item.id ?? i} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{item.descricao}</p>
                <p className="text-xs text-ink-muted">
                  {item.quantidade}× · {formatCurrency(item.valorUnitario)}
                  {item.tempoVendidoMinutos ? ` · ${formatMinutosParaHoras(item.tempoVendidoMinutos)}` : ''}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatCurrency(item.valorTotal)}</p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
