import { describe, expect, it } from 'vitest';
import { montarIndicadoresMecanico } from './IndicadoresMecanico';

describe('montarIndicadoresMecanico', () => {
  it('mostra a mão de obra por padrão (visão do gestor)', () => {
    expect(montarIndicadoresMecanico({}).map((i) => i.chave)).toContain('mao-de-obra');
  });

  it('esconde a mão de obra na visão do próprio mecânico', () => {
    const chaves = montarIndicadoresMecanico({}, true).map((i) => i.chave);
    expect(chaves).not.toContain('mao-de-obra');
    expect(chaves).toHaveLength(5);
  });
});
