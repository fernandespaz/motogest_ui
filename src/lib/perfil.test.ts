import { describe, expect, it } from 'vitest';
import { isMecanico } from './perfil';

describe('isMecanico', () => {
  it('matches the accented default profile name, case-insensitively', () => {
    expect(isMecanico('Mecânico')).toBe(true);
    expect(isMecanico('MECÂNICO')).toBe(true);
  });

  it('matches the unaccented spelling too', () => {
    expect(isMecanico('mecanico')).toBe(true);
  });

  it('matches as a substring of a longer renamed profile', () => {
    expect(isMecanico('Mecânico Sênior')).toBe(true);
  });

  it('returns false for a different profile name', () => {
    expect(isMecanico('Administrador')).toBe(false);
    expect(isMecanico('Consultor Técnico')).toBe(false);
  });

  it('returns false for nullish/empty input', () => {
    expect(isMecanico(undefined)).toBe(false);
    expect(isMecanico('')).toBe(false);
  });
});
