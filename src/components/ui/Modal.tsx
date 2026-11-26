import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
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
  /** Papel ARIA: `alertdialog` para avisos que exigem ciência (ver AlertDialog). */
  role?: 'dialog' | 'alertdialog';
  /** Nome acessível quando não há `title` visível. */
  ariaLabel?: string;
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

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Só entra na circulação do Tab o que está de fato na tela (não `hidden`, `display:none` nem `visibility:hidden`).
function visivel(el: HTMLElement) {
  if (el.closest('[hidden], [aria-hidden="true"]')) return false;
  const estilo = getComputedStyle(el);
  return estilo.display !== 'none' && estilo.visibility !== 'hidden';
}

export function Modal({ open, onClose, title, children, size = 'md', footer, centered, role = 'dialog', ariaLabel }: ModalProps) {
  // `id` e `onClose` ficam em refs: o efeito só roda quando `open` muda — se ele
  // refizesse o registro a cada render (onClose costuma ser uma arrow nova), o
  // modal de baixo voltaria pro topo da pilha ao re-renderizar.
  const idRef = useRef<symbol>(Symbol('modal'));
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const tituloId = useId();
  const painelRef = useRef<HTMLDivElement>(null);

  // Foco: ao abrir, vai pra dentro do modal (a menos que um campo com autoFocus já o tenha pego) e, ao fechar,
  // volta pro elemento que abriu — sem isso o teclado e o leitor de tela ficam perdidos atrás do modal.
  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    const painel = painelRef.current;
    if (painel && !painel.contains(document.activeElement)) painel.focus();
    return () => anterior?.focus?.();
  }, [open]);

  // Tab/Shift+Tab circulam dentro do modal em vez de escapar pra página de trás.
  function prenderTab(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return;
    const painel = e.currentTarget;
    if (!painel.contains(document.activeElement)) return;
    const itens = Array.from(painel.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(visivel);
    if (itens.length === 0) {
      e.preventDefault();
      return;
    }
    const primeiro = itens[0];
    const ultimo = itens[itens.length - 1];
    if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === painel)) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  }

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
            ref={painelRef}
            role={role}
            aria-modal="true"
            aria-labelledby={title ? tituloId : undefined}
            aria-label={title ? undefined : ariaLabel}
            tabIndex={-1}
            onKeyDown={prenderTab}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={clsx(
              'relative z-10 flex max-h-[92vh] w-full flex-col bg-surface shadow-xl focus:outline-none sm:rounded-2xl',
              centered ? 'rounded-2xl' : 'rounded-t-2xl',
              sizeStyles[size],
            )}
          >
            {title && (
              <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
                <h2 id={tituloId} className="text-base font-semibold text-ink">{title}</h2>
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
