import { describe, expect, it } from 'vitest';
import { isConsultor, isMecanico } from './perfil';

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

describe('isConsultor', () => {
  it('matches the seed profile name case/accent-insensitively', () => {
    expect(isConsultor('Consultor Técnico')).toBe(true);
    expect(isConsultor('CONSULTOR TECNICO')).toBe(true);
  });

  it('returns false for other profiles and empty input', () => {
    expect(isConsultor('Administrador')).toBe(false);
    expect(isConsultor('Mecânico')).toBe(false);
    expect(isConsultor(undefined)).toBe(false);
  });
});
