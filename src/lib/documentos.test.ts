import { describe, expect, it } from 'vitest';
import { formatPis, isCpfValido, isPisValido } from './documentos';

describe('isCpfValido', () => {
  it('aceita CPF válido, com ou sem máscara', () => {
    expect(isCpfValido('529.982.247-25')).toBe(true);
    expect(isCpfValido('52998224725')).toBe(true);
  });
  it('recusa dígito verificador errado, tamanho errado e sequência repetida', () => {
    expect(isCpfValido('52998224724')).toBe(false);
    expect(isCpfValido('1234')).toBe(false);
    expect(isCpfValido('11111111111')).toBe(false);
  });
});

describe('isPisValido', () => {
  it('aceita PIS válido e recusa verificador errado', () => {
    expect(isPisValido('120.31405.65-0')).toBe(true);
    expect(isPisValido('12031405651')).toBe(false);
    expect(isPisValido('123')).toBe(false);
  });
});

describe('formatPis', () => {
  it('aplica a máscara progressivamente', () => {
    expect(formatPis('12031405650')).toBe('120.31405.65-0');
    expect(formatPis('1203')).toBe('120.3');
  });
});
