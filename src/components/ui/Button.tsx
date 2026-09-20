import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-400 disabled:bg-brand-300',
  secondary: 'bg-surface-alt text-ink hover:bg-brand-50 dark:hover:bg-brand-900/40 border border-border focus-visible:ring-brand-300',
  outline:
    'bg-transparent text-brand-700 dark:text-brand-300 border border-brand-300 dark:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/40 focus-visible:ring-brand-300',
  ghost: 'bg-transparent text-ink hover:bg-surface-alt focus-visible:ring-brand-300',
  danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:ring-red-400 disabled:bg-red-300',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, disabled, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        disabled={disabled || loading}
        {...(props as any)}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {children}
      </motion.button>
    );
  },
);
Button.displayName = 'Button';
