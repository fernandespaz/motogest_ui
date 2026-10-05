import { describe, expect, it } from 'vitest';
import { ehNivelCombustivel, rotuloCombustivel } from './combustivel';

describe('combustivel', () => {
  it('labels the five marks and ignores anything else', () => {
    expect(rotuloCombustivel(0)).toBe('Reserva');
    expect(rotuloCombustivel(50)).toBe('1/2');
    expect(rotuloCombustivel(100)).toBe('Cheio');
    expect(rotuloCombustivel(33)).toBeUndefined();
    expect(rotuloCombustivel(null)).toBeUndefined();
  });

  it('only accepts the five marks as a level', () => {
    expect(ehNivelCombustivel(75)).toBe(true);
    expect(ehNivelCombustivel(60)).toBe(false);
    expect(ehNivelCombustivel(undefined)).toBe(false);
  });
});
