/** Carrocerias com modelo 3D. O cadastro de veículo/modelo ainda não guarda a
 * carroceria (não existe no OpenAPI), então ela é inferida do nome do modelo e
 * o consultor pode trocar manualmente — ver `inferirCarroceria`. */
export const CARROCERIAS = ['SEDAN', 'SUV', 'PICAPE'] as const;
export type Carroceria = (typeof CARROCERIAS)[number];

export const ROTULO_CARROCERIA: Record<Carroceria, string> = {
  SEDAN: 'Sedan',
  SUV: 'SUV',
  PICAPE: 'Picape',
};

const MODELOS_DIR = `${import.meta.env.BASE_URL}models/veiculos/`;

export const ARQUIVO_MODELO: Record<Carroceria, string> = {
  SEDAN: `${MODELOS_DIR}sedan.glb`,
  SUV: `${MODELOS_DIR}suv.glb`,
  PICAPE: `${MODELOS_DIR}picape.glb`,
};

// Modelos vendidos no Brasil agrupados pelo formato de carroceria. Hatch cai em
// SEDAN de propósito: só temos 3 modelos 3D, e o sedan é o mais próximo. A lista
// não precisa ser exaustiva — o que não casa vira SEDAN e o consultor ajusta.
const PICAPES = [
  'strada', 'toro', 'saveiro', 'montana', 'hilux', 'ranger', 's10', 's-10', 'amarok', 'l200',
  'triton', 'frontier', 'ram', 'maverick', 'oroch', 'hoggar', 'f-250', 'f250',
];
const SUVS = [
  'creta', 't-cross', 'tcross', 'tracker', 'compass', 'renegade', 'kicks', 'hr-v', 'hrv', 'nivus',
  'tera', 'pulse', 'fastback', 'duster', 'captur', 'corolla cross', 'taos', 'tiguan', 'sw4', 'trailblazer',
  'pajero', 'outlander', 'ecosport', 'territory', 'equinox', 'cr-v', 'crv', 'rav4', 'sportage', 'tucson',
  'commander', 'bronco', 'jimny', 'xc40', 'q3', 'q5', 'x1', 'x3', 'glb', 'gla', 'song', 'haval', 'tiggo',
];

function contem(texto: string, termos: string[]) {
  return termos.some((t) => new RegExp(`(^|[^a-z0-9])${t.replace(/[-]/g, '[- ]?')}([^a-z0-9]|$)`).test(texto));
}

/** Melhor palpite de carroceria pelo nome do modelo; SEDAN quando não reconhece. */
export function inferirCarroceria(marca?: string | null, modelo?: string | null): Carroceria {
  const texto = `${marca ?? ''} ${modelo ?? ''}`.toLowerCase();
  if (contem(texto, PICAPES)) return 'PICAPE';
  if (contem(texto, SUVS)) return 'SUV';
  return 'SEDAN';
}
