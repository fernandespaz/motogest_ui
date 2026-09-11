import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function Spinner({ className, size = 24 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={clsx('animate-spin text-brand-500', className)} />;
}

export function PageSpinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-muted">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
