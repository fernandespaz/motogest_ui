import { useState } from 'react';
import clsx from 'clsx';

interface BrandMarkProps {
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-lg',
};

/** Oficina's logoUrl when set and reachable, falling back to the MotoGest monogram otherwise. */
export function BrandMark({ logoUrl, size = 'md', className }: BrandMarkProps) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt="Logo da oficina"
        onError={() => setFailed(true)}
        className={clsx('shrink-0 rounded-lg object-cover', sizeStyles[size], className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-lg bg-brand-600 font-bold text-white',
        sizeStyles[size],
        className,
      )}
    >
      MG
    </div>
  );
}
