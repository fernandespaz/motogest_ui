import { describe, expect, it } from 'vitest';
import { inferirCarroceria } from './carroceria';

describe('inferirCarroceria', () => {
  it.each([
    ['Fiat', 'Strada', 'PICAPE'],
    ['Toyota', 'Hilux CD SRX', 'PICAPE'],
    ['Chevrolet', 'S10', 'PICAPE'],
    ['Volkswagen', 'T-Cross', 'SUV'],
    ['Volkswagen', 'T Cross Highline', 'SUV'],
    ['Hyundai', 'Creta', 'SUV'],
    ['Honda', 'HR-V', 'SUV'],
    ['Jeep', 'Compass', 'SUV'],
    ['Toyota', 'Corolla', 'SEDAN'],
    ['Chevrolet', 'Onix', 'SEDAN'],
  ] as const)('%s %s → %s', (marca, modelo, esperado) => {
    expect(inferirCarroceria(marca, modelo)).toBe(esperado);
  });

  it('não confunde pedaço de palavra com modelo (Ram ≠ Programa)', () => {
    expect(inferirCarroceria('Marca', 'Programa X')).toBe('SEDAN');
  });

  it('cai em SEDAN quando não há dado', () => {
    expect(inferirCarroceria(undefined, undefined)).toBe('SEDAN');
    expect(inferirCarroceria(null, '')).toBe('SEDAN');
  });
});
