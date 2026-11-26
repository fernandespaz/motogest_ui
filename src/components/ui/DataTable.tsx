import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageSpinner } from './Spinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  header: string;
  key?: string;
  render: (row: T) => ReactNode;
  className?: string;
  hideBelow?: 'sm' | 'md' | 'lg';
  /** Nome para leitor de tela quando `header` é vazio. Padrão: "Ações" (colunas de botões de linha). */
  srLabel?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Opcional — destaca a linha (ex.: seleção que só avança pra próxima etapa num botão à parte, não no próprio clique). Sem isso, comportamento idêntico ao de antes. */
  isRowSelected?: (row: T) => boolean;
}

const hideClass = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRowClick,
  isRowSelected,
}: DataTableProps<T>) {
  if (loading) return <PageSpinner label="Carregando registros..." />;
  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-t-2xl">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-xs uppercase tracking-wide text-ink">
            {columns.map((col, i) => (
              <th scope="col" key={i} className={`px-4 py-3 font-semibold sm:px-5 ${col.hideBelow ? hideClass[col.hideBelow] : ''}`}>
                {/* Coluna de ações vem sem título: leitor de tela precisa de um nome pra ela. */}
                {col.header || <span className="sr-only">{col.srLabel ?? 'Ações'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <motion.tr
              key={rowKey(row)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(idx * 0.02, 0.3) }}
              onClick={() => onRowClick?.(row)}
              // Linha clicável também por teclado. Só reage quando o foco está na própria linha: Enter num botão de
              // ação dentro dela não pode abrir o registro.
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
                      e.preventDefault();
                      onRowClick(row);
                    }
                  : undefined
              }
              className={`border-b border-border last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-surface-alt focus:outline-none focus-visible:bg-surface-alt focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400' : ''} ${isRowSelected?.(row) ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
            >
              {columns.map((col, i) => (
                <td key={i} className={`px-4 py-3 sm:px-5 ${col.className ?? ''} ${col.hideBelow ? hideClass[col.hideBelow] : ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
