import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { Card, CardBody } from '@/components/ui/Card';

/** Cartão de número do painel — compartilhado pelo dashboard geral e pelo do consultor. */
export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'brand',
  index,
  onClick,
  active,
  navega,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  index: number;
  // Opcional: quando presente, o cartão vira um botão (ex.: alternar um filtro),
  // com `active` marcando visualmente qual estado do toggle está selecionado.
  onClick?: () => void;
  active?: boolean;
  // O clique leva a outra tela (e não alterna um filtro) — mostra a seta.
  navega?: boolean;
}) {
  const toneClasses = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300',
    success: 'bg-green-50 text-success',
    warning: 'bg-amber-50 text-warning',
    danger: 'bg-red-50 text-danger',
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={clsx(
          'w-full text-left transition-[transform,box-shadow,border-color]',
          onClick &&
            'cursor-pointer hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-400',
          active && 'ring-2 ring-brand-500',
        )}
      >
        <CardBody className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-ink-muted">{label}</p>
            <p className="text-lg font-semibold text-ink">{value}</p>
          </div>
          {onClick && navega && <ChevronRight size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />}
        </CardBody>
      </Card>
    </motion.div>
  );
}
