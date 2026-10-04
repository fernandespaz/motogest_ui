import type { ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export type AlertTone = 'success' | 'info' | 'warning' | 'danger';

const toneStyles: Record<AlertTone, { icon: LucideIcon; circle: string }> = {
  success: { icon: CheckCircle2, circle: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300' },
  info: { icon: Info, circle: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300' },
  warning: { icon: AlertTriangle, circle: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' },
  danger: { icon: XCircle, circle: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
};

interface AlertDialogProps {
  open: boolean;
  tone?: AlertTone;
  title: string;
  /** Texto principal; `children` entra logo abaixo (listas, detalhes). */
  message?: string;
  children?: ReactNode;
  closeLabel?: string;
  onClose: () => void;
}

/**
 * Alerta bem visível no centro da tela (ícone por tom + texto + um botão de
 * ciência). Pra feedback que o usuário só precisa ver — quando houver decisão,
 * use ConfirmDialog.
 */
export function AlertDialog({ open, tone = 'info', title, message, children, closeLabel = 'Entendi', onClose }: AlertDialogProps) {
  const { icon: Icon, circle } = toneStyles[tone];
  return (
    <Modal open={open} onClose={onClose} size="sm" centered>
      <div role="alertdialog" aria-label={title} className="flex flex-col items-center text-center">
        <div className={clsx('mb-3 flex h-14 w-14 items-center justify-center rounded-full', circle)}>
          <Icon size={30} aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {message && <p className="mt-2 text-sm text-ink-muted">{message}</p>}
        {children && <div className="mt-3 w-full text-left text-sm text-ink">{children}</div>}
        <Button className="mt-5" fullWidth onClick={onClose}>
          {closeLabel}
        </Button>
      </div>
    </Modal>
  );
}
