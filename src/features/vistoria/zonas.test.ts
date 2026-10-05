import { describe, expect, it } from 'vitest';
import { ZONAS, arredondar, vistaDaNormal, zonaSugerida, type Vetor3 } from './zonas';

const normais: Vetor3[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0.5, z: 0.8 },
  { x: 0, y: 0.5, z: -0.8 },
  { x: 0.7, y: 0.3, z: 0.3 },
];

describe('zonaSugerida', () => {
  // Regressão: o primeiro rascunho montava o nome por template e gerou
  // PARALAMA_DIANTEIRA_ESQ (o enum do backend é DIANTEIRO) — o select ficava
  // sem opção selecionada e o valor ia vazio pro form.
  it('só devolve zonas que existem no enum do backend, em qualquer ponto do espaço do carro', () => {
    const validas = new Set<string>(ZONAS);
    for (let x = -1; x <= 1; x += 0.25) {
      for (let y = 0; y <= 1.6; y += 0.2) {
        for (let z = -2; z <= 2; z += 0.25) {
          for (const n of normais) {
            expect(validas.has(zonaSugerida({ x, y, z }, n))).toBe(true);
          }
        }
      }
    }
  });

  it('distingue esquerda (+X) de direita (−X)', () => {
    const porta = { x: 0.77, y: 0.6, z: 0.17 };
    expect(zonaSugerida(porta, { x: 1, y: 0, z: 0 })).toBe('PORTA_DIANTEIRA_ESQ');
    expect(zonaSugerida({ ...porta, x: -0.77 }, { x: -1, y: 0, z: 0 })).toBe('PORTA_DIANTEIRA_DIR');
  });

  it.each([
    ['para-choque dianteiro', { x: 0.6, y: 0.42, z: 1.76 }, { x: 0, y: 0, z: 1 }, 'PARA_CHOQUE_DIANTEIRO'],
    ['para-choque traseiro', { x: 0, y: 0.4, z: -1.8 }, { x: 0, y: 0, z: -1 }, 'PARA_CHOQUE_TRASEIRO'],
    ['grade', { x: 0.1, y: 0.6, z: 1.8 }, { x: 0, y: 0, z: 1 }, 'GRADE'],
    ['farol esquerdo', { x: 0.6, y: 0.65, z: 1.8 }, { x: 0, y: 0, z: 1 }, 'FAROL_ESQ'],
    ['lanterna direita', { x: -0.6, y: 0.65, z: -1.8 }, { x: 0, y: 0, z: -1 }, 'LANTERNA_DIR'],
    ['capô', { x: 0, y: 0.9, z: 1.3 }, { x: 0, y: 1, z: 0 }, 'CAPO'],
    ['teto', { x: 0.3, y: 1.2, z: 0 }, { x: 0, y: 1, z: 0 }, 'TETO'],
    ['porta-malas', { x: 0, y: 0.9, z: -1.4 }, { x: 0, y: 1, z: 0 }, 'PORTA_MALAS'],
    ['para-brisa', { x: 0, y: 1, z: 0.8 }, { x: 0, y: 0.5, z: 0.8 }, 'PARABRISA'],
    ['vidro traseiro', { x: 0, y: 1, z: -0.8 }, { x: 0, y: 0.5, z: -0.8 }, 'VIDRO_TRASEIRO'],
    ['roda dianteira esquerda', { x: 0.72, y: 0.15, z: 1.0 }, { x: 0, y: 0, z: -1 }, 'RODA_DIANTEIRA_ESQ'],
    ['roda traseira esquerda', { x: 0.78, y: 0.43, z: -1.27 }, { x: 1, y: 0, z: 0 }, 'RODA_TRASEIRA_ESQ'],
    ['paralama dianteiro esquerdo', { x: 0.76, y: 0.71, z: 1.26 }, { x: 1, y: 0, z: 0 }, 'PARALAMA_DIANTEIRO_ESQ'],
    ['paralama traseiro direito', { x: -0.7, y: 0.79, z: -1.54 }, { x: -1, y: 0, z: 0 }, 'PARALAMA_TRASEIRO_DIR'],
    ['porta traseira esquerda', { x: 0.78, y: 0.58, z: -0.66 }, { x: 1, y: 0, z: 0 }, 'PORTA_TRASEIRA_ESQ'],
    ['soleira direita', { x: -0.8, y: 0.2, z: 0.2 }, { x: -1, y: 0, z: 0 }, 'SOLEIRA_DIR'],
    ['vidro lateral esquerdo', { x: 0.7, y: 1.0, z: 0.2 }, { x: 1, y: 0, z: 0 }, 'VIDRO_LATERAL_ESQ'],
  ] as const)('%s', (_nome, ponto, normal, esperado) => {
    expect(zonaSugerida(ponto, normal)).toBe(esperado);
  });
});

describe('vistaDaNormal', () => {
  it('escolhe o lado pela direção dominante da normal', () => {
    expect(vistaDaNormal({ x: 0, y: 1, z: 0 })).toBe('TOPO');
    expect(vistaDaNormal({ x: 0.1, y: 0, z: 1 })).toBe('FRENTE');
    expect(vistaDaNormal({ x: 0, y: 0, z: -1 })).toBe('TRAS');
    expect(vistaDaNormal({ x: 1, y: 0, z: 0.2 })).toBe('ESQ');
    expect(vistaDaNormal({ x: -1, y: 0, z: 0.2 })).toBe('DIR');
  });
});

describe('arredondar', () => {
  it('limita a posição a 3 casas decimais', () => {
    expect(arredondar({ x: 0.123456, y: 1.0004, z: -2.9996 })).toEqual({ x: 0.123, y: 1, z: -3 });
  });
});
