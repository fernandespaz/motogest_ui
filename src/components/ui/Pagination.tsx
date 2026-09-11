import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  totalElements?: number;
}

export function Pagination({ page, totalPages, onChange, totalElements }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
      <p className="text-xs text-ink-muted">
        Página {page + 1} de {totalPages}
        {typeof totalElements === 'number' && ` · ${totalElements} registros`}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => onChange(page - 1)} disabled={page <= 0}>
          <ChevronLeft size={16} /> Anterior
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onChange(page + 1)} disabled={page + 1 >= totalPages}>
          Próxima <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
