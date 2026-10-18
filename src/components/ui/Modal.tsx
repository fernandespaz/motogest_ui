import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /** Rendered in a bar pinned to the modal's bottom, outside the scrollable body — for
   *  long forms whose Salvar/Cancelar buttons would otherwise scroll out of view. */
  footer?: ReactNode;
  /** Mantém o modal no centro da tela também no celular (por padrão vira bottom sheet abaixo de `sm`). */
  centered?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  // Formulários de duas colunas (ex.: cliente) que não devem exigir rolagem em telas de desktop.
  '2xl': 'max-w-5xl',
  // Telas de escolha com lista + filtros (ex.: agendamento), que precisam de largura pra respirar.
  '3xl': 'max-w-6xl',
};

// Modais abertos, do mais antigo ao mais recente — com um modal aberto por
// cima de outro (ex.: "Novo cliente" dentro do agendamento), o Esc só pode
// fechar o de cima, e o scroll da página só volta quando o último fecha.
const modaisAbertos: symbol[] = [];

export function Modal({ open, onClose, title, children, size = 'md', footer, centered }: ModalProps) {
  // `id` e `onClose` ficam em refs: o efeito só roda quando `open` muda — se ele
  // refizesse o registro a cada render (onClose costuma ser uma arrow nova), o
  // modal de baixo voltaria pro topo da pilha ao re-renderizar.
  const idRef = useRef<symbol>(Symbol('modal'));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = idRef.current;
    modaisAbertos.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modaisAbertos[modaisAbertos.length - 1] === id) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      modaisAbertos.splice(modaisAbertos.indexOf(id), 1);
      if (modaisAbertos.length === 0) document.body.style.overflow = '';
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={clsx(
            'fixed inset-0 z-50 flex justify-center sm:items-center sm:p-4',
            centered ? 'items-center p-4' : 'items-end',
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={clsx(
              'relative z-10 flex max-h-[92vh] w-full flex-col bg-surface shadow-xl sm:rounded-2xl',
              centered ? 'rounded-2xl' : 'rounded-t-2xl',
              sizeStyles[size],
            )}
          >
            {title && (
              <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="overflow-y-auto p-5">{children}</div>
            {footer && (
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
