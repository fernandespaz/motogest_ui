import clsx from 'clsx';
import type { CategoriaComplexidade } from '@/api/types';
import { ESTILO_CATEGORIA_COMPLEXIDADE } from '@/lib/categoria';

const tamanhos = {
  sm: 'h-6 w-6 rounded-md text-xs',
  md: 'h-8 w-8 rounded-lg text-sm',
  lg: 'h-10 w-10 rounded-xl text-lg',
};

/** A letra da categoria (A/B/C) num selo colorido — mais fácil de bater o olho do que um badge de texto. */
export function CategoriaTile({
  categoria,
  size = 'md',
  className,
}: {
  categoria: CategoriaComplexidade;
  size?: keyof typeof tamanhos;
  className?: string;
}) {
  return (
    <span
      title={`Categoria ${categoria}`}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center border font-bold',
        tamanhos[size],
        ESTILO_CATEGORIA_COMPLEXIDADE[categoria],
        className,
      )}
    >
      <span aria-hidden="true">{categoria}</span>
      <span className="sr-only">Categoria {categoria}</span>
    </span>
  );
}
