import type { CategoriaComplexidade } from '@/api/types';

/** Opções pro seletor de categoria de complexidade (A/B/C) — usado tanto no
 * cadastro de Serviço (categoria de referência) quanto no de Veículo
 * (categoria real, que decide a hora técnica aplicada — ver doc de
 * Precificação por Categoria, atualização 29/09). */
export const CATEGORIAS_COMPLEXIDADE: { value: CategoriaComplexidade; label: string }[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

export const TOM_CATEGORIA_COMPLEXIDADE: Record<CategoriaComplexidade, 'success' | 'brand' | 'warning'> = {
  A: 'success',
  B: 'brand',
  C: 'warning',
};

/** Cores do "selo" de categoria (tile maior que o Badge) — a mesma leitura A verde / B laranja / C âmbar em toda a tela. */
export const ESTILO_CATEGORIA_COMPLEXIDADE: Record<CategoriaComplexidade, string> = {
  A: 'border-green-500/50 bg-green-500/15 text-green-700 dark:text-green-300',
  B: 'border-brand-500/50 bg-brand-500/15 text-brand-700 dark:text-brand-300',
  C: 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300',
};
