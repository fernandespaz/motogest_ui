import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  totalElements?: number;
  // Opcionais — só telas que precisam controlar o tamanho da página (ex.:
  // listas que crescem bastante, como Ordens de Serviço) passam os dois;
  // sem eles o seletor de "itens por página" simplesmente não aparece,
  // mantendo o comportamento atual de todas as outras telas que usam esse
  // componente.
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

// Intercala números de página com "…" pra não estourar a largura em listas
// com muitas páginas — sempre mostra a primeira, a última e uma vizinhança
// da página atual, igual ao padrão usado por qualquer paginação numerada.
function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const keep = new Set<number>([0, total - 1, current]);
  if (current > 0) keep.add(current - 1);
  if (current < total - 1) keep.add(current + 1);
  const sorted = [...keep].sort((a, b) => a - b);
  const result: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (i > 0 && prev !== undefined) {
      // Só um número escondido entre dois já exibidos — mostra ele direto
      // em vez de "…", que fica estranho representando um único número.
      if (p - prev === 2) result.push(prev + 1);
      else if (p - prev > 2) result.push('…');
    }
    result.push(p);
  });
  return result;
}

export function Pagination({
  page,
  totalPages,
  onChange,
  totalElements,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  if (totalPages <= 1 && !onPageSizeChange) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
        {onPageSizeChange && pageSize && (
          <label className="flex items-center gap-1.5">
            Itens por página
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-md border border-border bg-surface-alt px-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        {typeof totalElements === 'number' && <span>{totalElements} registros</span>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 0}
            aria-label="Página anterior"
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-ink-muted">
                …
              </span>
            ) : (
              <button
                type="button"
                key={p}
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors',
                  p === page ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-surface-alt hover:text-ink',
                )}
              >
                {p + 1}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page + 1 >= totalPages}
            aria-label="Próxima página"
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
