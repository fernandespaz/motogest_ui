import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

// Mesmo vocabulário de tom do Badge (components/ui/Badge.tsx) — uma ação de
// aprovar/editar/excluir/enviar deve "ler" com a mesma cor que o status
// correspondente já usa em qualquer badge do app, em vez de inventar uma
// paleta paralela por tela.
type Tone = 'neutral' | 'brand' | 'success' | 'danger';

interface IconActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'aria-label'> {
  icon: PhosphorIcon;
  /** Vira o `title` (tooltip) e o `aria-label` — uma ação só com ícone não tem nome acessível sem isso. */
  label: string;
  tone?: Tone;
  /** Tamanho do ícone em si (px). O botão em volta tem tamanho fixo (h-10 w-10). */
  iconSize?: number;
}

// Chip sólido (fundo colorido + ícone branco), não um ícone-fantasma que só
// ganha cor no hover — um ícone cinza-claro lia como "apagado"/sem vida numa
// lista inteira de ações. O hover escurece/realça o mesmo tom, nunca troca de
// cor.
const toneStyles: Record<Tone, string> = {
  neutral: 'bg-surface-alt text-ink-muted hover:bg-border hover:text-ink',
  brand: 'bg-brand-600 text-white hover:bg-brand-700',
  success: 'bg-success text-white hover:brightness-110',
  danger: 'bg-danger text-white hover:brightness-110',
};

/**
 * Ação de linha (tabela, cartão) representada só por ícone — Editar, Remover,
 * Enviar, Aprovar/Rejeitar quando um `Button` rotulado for exagerado pro
 * contexto. Um só componente para as ~17 telas do app que hoje reimplementam
 * essa mesma combinação de classes (h-10 w-10, chip colorido) cada uma à sua
 * maneira — ver reference/coding-standards.md#ícones-de-ação para a regra
 * completa (quando usar isto vs. Button). Ícones vêm de
 * `@phosphor-icons/react` no peso `fill` — mais "cheios"/visíveis que um
 * outline fino numa lista de ações pequenas.
 */
export const IconActionButton = forwardRef<HTMLButtonElement, IconActionButtonProps>(
  ({ icon: Icon, label, tone = 'neutral', iconSize = 20, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className={clsx(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      <Icon size={iconSize} weight="fill" />
    </button>
  ),
);
IconActionButton.displayName = 'IconActionButton';
