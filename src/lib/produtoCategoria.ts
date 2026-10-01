import {
  Drop,
  Funnel,
  Disc,
  Compass,
  Engine,
  LinkSimple,
  GearSix,
  Thermometer,
  Lightning,
  BatteryCharging,
  Wind,
  Fire,
  Tire,
  Car,
  Package,
  type Icon,
} from '@phosphor-icons/react';
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

/** Ícone de cada categoria — usado nos filtros e como arte do cartão do produto. */
export const PRODUTO_CATEGORIA_ICONS: Record<ProdutoCategoria, Icon> = {
  OLEO_LUBRIFICANTE: Drop,
  FILTROS: Funnel,
  FREIOS: Disc,
  SUSPENSAO_DIRECAO: Compass,
  MOTOR: Engine,
  CORREIAS_TENSORES: LinkSimple,
  TRANSMISSAO_EMBREAGEM: GearSix,
  ARREFECIMENTO: Thermometer,
  IGNICAO_INJECAO: Lightning,
  ELETRICA_BATERIA: BatteryCharging,
  AR_CONDICIONADO: Wind,
  ESCAPAMENTO: Fire,
  PNEUS_RODAS: Tire,
  CARROCERIA_ACESSORIOS: Car,
  OUTROS: Package,
};

export function produtoCategoriaIcon(categoria?: string | null): Icon {
  if (!categoria) return Package;
  return PRODUTO_CATEGORIA_ICONS[categoria as ProdutoCategoria] ?? Package;
}

export const PRODUTO_CATEGORIAS = Object.keys(PRODUTO_CATEGORIA_LABELS) as ProdutoCategoria[];

/** Categorias em destaque nos filtros da tela de produtos — as de maior giro na oficina. */
export const PRODUTO_CATEGORIAS_PRINCIPAIS: ProdutoCategoria[] = [
  'OLEO_LUBRIFICANTE',
  'FILTROS',
  'SUSPENSAO_DIRECAO',
  'ESCAPAMENTO',
  'IGNICAO_INJECAO',
  'ELETRICA_BATERIA',
  'AR_CONDICIONADO',
];

/** O restante (inclusive `OUTROS`) fica recolhido atrás do filtro "Outros". */
export const PRODUTO_CATEGORIAS_SECUNDARIAS = PRODUTO_CATEGORIAS.filter((c) => !PRODUTO_CATEGORIAS_PRINCIPAIS.includes(c));

export function produtoCategoriaLabel(categoria?: string | null): string {
  if (!categoria) return '—';
  return PRODUTO_CATEGORIA_LABELS[categoria as ProdutoCategoria] ?? categoria;
}
