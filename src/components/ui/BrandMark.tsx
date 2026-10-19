import { useState } from 'react';
import clsx from 'clsx';

interface BrandMarkProps {
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeStyles = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-lg',
  xl: 'h-12 w-12 text-xl',
};

/** Oficina's logoUrl when set and reachable, falling back to the MotoGest monogram otherwise. */
export function BrandMark({ logoUrl, size = 'md', className }: BrandMarkProps) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      // Anel em degradê da marca + brilho: destaca a logo da oficina (que costuma
      // ser escura) sobre o grafite sem precisar de um fundo branco.
      <span
        className={clsx(
          'inline-flex shrink-0 rounded-full bg-gradient-to-br from-brand-300 via-brand-500 to-brand-700 p-[2px] shadow-brand-glow',
          sizeStyles[size],
          className,
        )}
      >
        <img
          src={logoUrl}
          alt="Logo da oficina"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full bg-graphite-2 object-cover"
        />
      </span>
    );
  }

  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-xl bg-brand-600 font-bold text-white',
        sizeStyles[size],
        className,
      )}
    >
      MG
    </div>
  );
}
