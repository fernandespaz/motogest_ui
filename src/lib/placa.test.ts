import { describe, expect, it } from 'vitest';
import { normalizarPlaca, placaValida } from './placa';

describe('placa', () => {
  it('normaliza maiúsculas, hífen e espaços', () => {
    expect(normalizarPlaca(' abc-1d23 ')).toBe('ABC1D23');
    expect(normalizarPlaca(undefined)).toBe('');
  });

  it('aceita placa antiga e Mercosul', () => {
    expect(placaValida('ABC-1234')).toBe(true);
    expect(placaValida('abc1d23')).toBe(true);
  });

  it('rejeita formatos inválidos', () => {
    expect(placaValida('AB12345')).toBe(false);
    expect(placaValida('ABC123')).toBe(false);
    expect(placaValida('ABC12345')).toBe(false);
    expect(placaValida('')).toBe(false);
  });
});
