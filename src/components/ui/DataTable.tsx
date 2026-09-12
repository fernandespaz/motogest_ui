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
}: DataTableProps<T>) {
  if (loading) return <PageSpinner label="Carregando registros..." />;
  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
            {columns.map((col, i) => (
              <th key={i} className={`px-4 py-2.5 font-medium sm:px-5 ${col.hideBelow ? hideClass[col.hideBelow] : ''}`}>
                {col.header}
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
              className={`border-b border-border last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-surface-alt' : ''}`}
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
