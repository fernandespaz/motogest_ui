import { describe, expect, it } from 'vitest';
import { acrescimoSobreBase, lucroDoItem, margemSobrePreco, precoComAcrescimo } from './margem';

describe('margem', () => {
  it('preço final = valor da peça + o percentual informado', () => {
    expect(precoComAcrescimo(150, 25)).toBe(187.5);
    expect(precoComAcrescimo(100, 0)).toBe(100);
    expect(precoComAcrescimo(80, 33.33)).toBe(106.66);
  });

  it('recusa valores inválidos em vez de devolver lixo', () => {
    expect(precoComAcrescimo(-5, 10)).toBeUndefined();
    expect(precoComAcrescimo(100, -1)).toBeUndefined();
    expect(precoComAcrescimo(NaN, 10)).toBeUndefined();
  });

  it('deriva o acréscimo do preço vigente (acompanha um preço digitado)', () => {
    expect(acrescimoSobreBase(150, 187.5)).toBe(25);
    expect(acrescimoSobreBase(100, 80)).toBe(-20);
    expect(acrescimoSobreBase(0, 80)).toBeUndefined();
  });

  it('lucro e margem sobre o preço de venda, para o resumo do consultor', () => {
    expect(lucroDoItem(60, 100, 3)).toBe(120);
    expect(margemSobrePreco(60, 100)).toBe(40);
    expect(margemSobrePreco(60, 0)).toBeUndefined();
  });
});
