import { describe, expect, it } from 'vitest';
import { pinVisivel } from './pinVisivel';

describe('pinVisivel', () => {
  const lateralEsquerda = { x: 6, y: 1.6, z: 0 };
  const frente = { x: 0, y: 1.6, z: 6 };
  const traseira = { x: 0, y: 1.6, z: -6 };
  const topo = { x: 0, y: 9.6, z: 0.01 };

  it('mostra o pino quando a câmera está do mesmo lado da superfície marcada', () => {
    expect(pinVisivel(lateralEsquerda, 'ESQ')).toBe(true);
    expect(pinVisivel({ ...lateralEsquerda, x: -6 }, 'DIR')).toBe(true);
    expect(pinVisivel(frente, 'FRENTE')).toBe(true);
    expect(pinVisivel(traseira, 'TRAS')).toBe(true);
    expect(pinVisivel(topo, 'TOPO')).toBe(true);
  });

  it('esconde o pino quando a marca está no lado oposto ao da câmera', () => {
    expect(pinVisivel(lateralEsquerda, 'DIR')).toBe(false);
    expect(pinVisivel(frente, 'TRAS')).toBe(false);
    expect(pinVisivel(lateralEsquerda, 'FRENTE')).toBe(false);
    // A 1,6 de altura (vistas laterais do viewer) capô e teto aparecem de raspão; só some com a câmera rente ao chão.
    expect(pinVisivel(lateralEsquerda, 'TOPO')).toBe(true);
    expect(pinVisivel({ x: 6, y: 0.8, z: 0 }, 'TOPO')).toBe(false);
  });

  it('sem vista registrada, mostra sempre', () => {
    expect(pinVisivel(lateralEsquerda, undefined)).toBe(true);
  });

  it('em vista 3/4 (câmera inicial) enxerga os dois lados que ela vê', () => {
    const tresQuartos = { x: 4.3, y: 2.2, z: 4.7 };
    expect(pinVisivel(tresQuartos, 'ESQ')).toBe(true);
    expect(pinVisivel(tresQuartos, 'FRENTE')).toBe(true);
    expect(pinVisivel(tresQuartos, 'DIR')).toBe(false);
    expect(pinVisivel(tresQuartos, 'TRAS')).toBe(false);
  });
});
