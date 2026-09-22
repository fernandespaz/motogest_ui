import type { ProdutoCategoria } from '@/api/types';

/** Rótulo de cada categoria de produto — ordem usada nos filtros e no formulário. */
export const PRODUTO_CATEGORIA_LABELS: Record<ProdutoCategoria, string> = {
  OLEO_LUBRIFICANTE: 'Óleo e lubrificante',
  FILTROS: 'Filtros',
  FREIOS: 'Freios',
  SUSPENSAO_DIRECAO: 'Suspensão e direção',
  MOTOR: 'Motor',
  CORREIAS_TENSORES: 'Correias e tensores',
  TRANSMISSAO_EMBREAGEM: 'Transmissão e embreagem',
  ARREFECIMENTO: 'Arrefecimento',
  IGNICAO_INJECAO: 'Ignição e injeção',
  ELETRICA_BATERIA: 'Elétrica e bateria',
  AR_CONDICIONADO: 'Ar-condicionado',
  ESCAPAMENTO: 'Escapamento',
  PNEUS_RODAS: 'Pneus e rodas',
  CARROCERIA_ACESSORIOS: 'Carroceria e acessórios',
  OUTROS: 'Outros',
};

export const PRODUTO_CATEGORIAS = Object.keys(PRODUTO_CATEGORIA_LABELS) as ProdutoCategoria[];

export function produtoCategoriaLabel(categoria?: string | null): string {
  if (!categoria) return '—';
  return PRODUTO_CATEGORIA_LABELS[categoria as ProdutoCategoria] ?? categoria;
}
