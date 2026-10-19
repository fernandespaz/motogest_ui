import { describe, expect, it } from 'vitest';
import { gerarCsv } from './csv';

describe('gerarCsv', () => {
  it('uses ; and a decimal comma, and starts with a BOM so Excel reads the accents', () => {
    const csv = gerarCsv([['Categoria', 'Valor'], ['Água', 12.5]]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.slice(1)).toBe('Categoria;Valor\r\nÁgua;12,5');
  });

  it('quotes cells that contain the separator, quotes or line breaks, and leaves empty ones blank', () => {
    const csv = gerarCsv([['a;b', 'diz "oi"', 'linha\nnova', null, undefined]]);
    expect(csv.slice(1)).toBe('"a;b";"diz ""oi""";"linha\nnova";;');
  });
});
