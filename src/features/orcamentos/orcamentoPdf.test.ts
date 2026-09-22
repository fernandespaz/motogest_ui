import { describe, expect, it } from 'vitest';
import { calcularValidade } from './orcamentoPdf';

describe('calcularValidade', () => {
  it('adds validadeDias to the emission date', () => {
    expect(calcularValidade({ dataEmissao: '2026-09-10T12:00:00', validadeDias: 7 })).toBe('17/09/2026');
  });

  it('falls back to createdAt for a quote not yet sent', () => {
    expect(calcularValidade({ createdAt: '2026-09-01T12:00:00', validadeDias: 30 })).toBe('01/10/2026');
  });

  it('prints nothing without a base date or a validity', () => {
    expect(calcularValidade({ validadeDias: 7 })).toBeUndefined();
    expect(calcularValidade({ createdAt: '2026-09-01T12:00:00' })).toBeUndefined();
  });
});
