import type { PosicaoAvaria, TipoAvaria, VistaAvaria, ZonaAvaria } from '@/api/types';

// Record<…> em vez de array solto: se o backend ganhar/perder uma zona e o
// schema gerado mudar, o tsc quebra aqui em vez de deixar o select incompleto.
export const ROTULO_ZONA: Record<ZonaAvaria, string> = {
  PARA_CHOQUE_DIANTEIRO: 'Para-choque dianteiro',
  PARA_CHOQUE_TRASEIRO: 'Para-choque traseiro',
  CAPO: 'Capô',
  TETO: 'Teto',
  PORTA_MALAS: 'Porta-malas / caçamba',
  GRADE: 'Grade',
  PARALAMA_DIANTEIRO_ESQ: 'Paralama dianteiro esquerdo',
  PARALAMA_DIANTEIRO_DIR: 'Paralama dianteiro direito',
  PARALAMA_TRASEIRO_ESQ: 'Paralama traseiro esquerdo',
  PARALAMA_TRASEIRO_DIR: 'Paralama traseiro direito',
  PORTA_DIANTEIRA_ESQ: 'Porta dianteira esquerda',
  PORTA_DIANTEIRA_DIR: 'Porta dianteira direita',
  PORTA_TRASEIRA_ESQ: 'Porta traseira esquerda',
  PORTA_TRASEIRA_DIR: 'Porta traseira direita',
  SOLEIRA_ESQ: 'Soleira esquerda',
  SOLEIRA_DIR: 'Soleira direita',
  PARABRISA: 'Para-brisa',
  VIDRO_TRASEIRO: 'Vidro traseiro',
  VIDRO_LATERAL_ESQ: 'Vidro lateral esquerdo',
  VIDRO_LATERAL_DIR: 'Vidro lateral direito',
  FAROL_ESQ: 'Farol esquerdo',
  FAROL_DIR: 'Farol direito',
  LANTERNA_ESQ: 'Lanterna esquerda',
  LANTERNA_DIR: 'Lanterna direita',
  RETROVISOR_ESQ: 'Retrovisor esquerdo',
  RETROVISOR_DIR: 'Retrovisor direito',
  RODA_DIANTEIRA_ESQ: 'Roda dianteira esquerda',
  RODA_DIANTEIRA_DIR: 'Roda dianteira direita',
  RODA_TRASEIRA_ESQ: 'Roda traseira esquerda',
  RODA_TRASEIRA_DIR: 'Roda traseira direita',
  INTERIOR: 'Interior',
  OUTRA: 'Outra região',
};

export const ROTULO_TIPO: Record<TipoAvaria, string> = {
  ARRANHAO: 'Arranhão',
  AMASSADO: 'Amassado',
  TRINCA: 'Trinca',
  FALTANDO: 'Peça faltando',
  OUTRO: 'Outro',
};

// Um tom por tipo, escolhido pra continuar distinguível sobre a carroceria cinza.
export const COR_TIPO: Record<TipoAvaria, string> = {
  ARRANHAO: '#f59e0b',
  AMASSADO: '#ef4444',
  TRINCA: '#8b5cf6',
  FALTANDO: '#0ea5e9',
  OUTRO: '#64748b',
};

export const ROTULO_VISTA: Record<VistaAvaria, string> = {
  ESQ: 'Lateral esquerda',
  DIR: 'Lateral direita',
  FRENTE: 'Frente',
  TRAS: 'Traseira',
  TOPO: 'Topo',
};

export const ZONAS = Object.keys(ROTULO_ZONA) as ZonaAvaria[];
export const TIPOS = Object.keys(ROTULO_TIPO) as TipoAvaria[];
export const VISTAS = Object.keys(ROTULO_VISTA) as VistaAvaria[];

/** Ponto ou direção no espaço normalizado do carro (frente = +Z, esquerda = +X, chão = y 0). */
export interface Vetor3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Palpite da região a partir de onde o consultor tocou. É só uma sugestão —
 * as faixas são calibradas pro comprimento normalizado (4 unidades) comum aos
 * três modelos, e a zona continua editável na lista. Funciona por posição e
 * normal da superfície, e não por nome de peça, porque os nomes dos meshes
 * mudam de um .glb pro outro.
 */
export function zonaSugerida(p: Vetor3, n: Vetor3): ZonaAvaria {
  const esquerda = p.x >= 0;
  // Zonas sempre literais (nunca montadas por template): um typo viraria um valor
  // fora do enum do backend, que o tsc não pegaria com string concatenada.
  const lado = (esq: ZonaAvaria, dir: ZonaAvaria) => (esquerda ? esq : dir);
  const dianteira = p.z >= 0;
  const absX = Math.abs(p.x);
  const absZ = Math.abs(p.z);

  if (absZ > 1.6) {
    if (dianteira) {
      if (p.y > 0.5) return absX > 0.4 ? lado('FAROL_ESQ', 'FAROL_DIR') : 'GRADE';
      return 'PARA_CHOQUE_DIANTEIRO';
    }
    if (p.y > 0.5) return absX > 0.4 ? lado('LANTERNA_ESQ', 'LANTERNA_DIR') : 'PORTA_MALAS';
    return 'PARA_CHOQUE_TRASEIRO';
  }

  // Roda por posição: o pneu tem normais voltadas pra todo lado, então a normal não serve aqui.
  if (p.y < 0.62 && absZ > 0.75 && absZ < 1.45 && absX > 0.5) {
    return dianteira ? lado('RODA_DIANTEIRA_ESQ', 'RODA_DIANTEIRA_DIR') : lado('RODA_TRASEIRA_ESQ', 'RODA_TRASEIRA_DIR');
  }

  if (n.y > 0.75) {
    if (p.z > 0.9) return 'CAPO';
    if (p.z < -0.95) return 'PORTA_MALAS';
    return 'TETO';
  }

  if (Math.abs(n.z) > 0.5 && n.y > 0.1 && p.y > 0.8) return n.z > 0 ? 'PARABRISA' : 'VIDRO_TRASEIRO';

  if (Math.abs(n.x) > 0.5) {
    if (p.y < 0.3 && absZ < 0.95) return lado('SOLEIRA_ESQ', 'SOLEIRA_DIR');
    if (p.y > 0.8 && p.y < 1.05 && absX > 0.8 && p.z > 0.55 && p.z < 1.0) return lado('RETROVISOR_ESQ', 'RETROVISOR_DIR');
    if (absZ > 0.75) {
      return dianteira
        ? lado('PARALAMA_DIANTEIRO_ESQ', 'PARALAMA_DIANTEIRO_DIR')
        : lado('PARALAMA_TRASEIRO_ESQ', 'PARALAMA_TRASEIRO_DIR');
    }
    if (p.y > 0.95) return lado('VIDRO_LATERAL_ESQ', 'VIDRO_LATERAL_DIR');
    return dianteira ? lado('PORTA_DIANTEIRA_ESQ', 'PORTA_DIANTEIRA_DIR') : lado('PORTA_TRASEIRA_ESQ', 'PORTA_TRASEIRA_DIR');
  }

  return 'OUTRA';
}

/** Lado do carro que o consultor estava olhando, pela normal da superfície marcada. */
export function vistaDaNormal(n: Vetor3): VistaAvaria {
  if (n.y > 0.8) return 'TOPO';
  if (Math.abs(n.z) > Math.abs(n.x)) return n.z > 0 ? 'FRENTE' : 'TRAS';
  return n.x > 0 ? 'ESQ' : 'DIR';
}

export function arredondar(v: Vetor3): PosicaoAvaria {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return { x: r(v.x), y: r(v.y), z: r(v.z) };
}
