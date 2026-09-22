import {
  Droplet,
  Filter,
  Disc,
  Disc3,
  Compass,
  Cog,
  Link2,
  Settings2,
  Thermometer,
  Zap,
  BatteryCharging,
  Wind,
  Flame,
  Car,
  Package,
  type LucideIcon,
} from 'lucide-react';
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

/** Ícone de cada categoria — usado nos chips de filtro e no avatar da linha do produto. */
export const PRODUTO_CATEGORIA_ICONS: Record<ProdutoCategoria, LucideIcon> = {
  OLEO_LUBRIFICANTE: Droplet,
  FILTROS: Filter,
  FREIOS: Disc,
  SUSPENSAO_DIRECAO: Compass,
  MOTOR: Cog,
  CORREIAS_TENSORES: Link2,
  TRANSMISSAO_EMBREAGEM: Settings2,
  ARREFECIMENTO: Thermometer,
  IGNICAO_INJECAO: Zap,
  ELETRICA_BATERIA: BatteryCharging,
  AR_CONDICIONADO: Wind,
  ESCAPAMENTO: Flame,
  PNEUS_RODAS: Disc3,
  CARROCERIA_ACESSORIOS: Car,
  OUTROS: Package,
};

export function produtoCategoriaIcon(categoria?: string | null): LucideIcon {
  if (!categoria) return Package;
  return PRODUTO_CATEGORIA_ICONS[categoria as ProdutoCategoria] ?? Package;
}

export const PRODUTO_CATEGORIAS = Object.keys(PRODUTO_CATEGORIA_LABELS) as ProdutoCategoria[];

export function produtoCategoriaLabel(categoria?: string | null): string {
  if (!categoria) return '—';
  return PRODUTO_CATEGORIA_LABELS[categoria as ProdutoCategoria] ?? categoria;
}
