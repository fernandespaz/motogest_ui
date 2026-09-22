import { motion } from 'framer-motion';
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
          'w-full text-left transition-shadow',
          onClick && 'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-400',
          active && 'ring-2 ring-brand-500',
        )}
      >
        <CardBody className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-ink-muted">{label}</p>
            <p className="text-lg font-semibold text-ink">{value}</p>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
