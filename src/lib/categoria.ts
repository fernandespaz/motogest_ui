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
