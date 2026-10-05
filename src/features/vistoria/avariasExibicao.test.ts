import { describe, expect, it } from 'vitest';
import { avariasParaExibicao } from './avariasExibicao';

describe('avariasParaExibicao', () => {
  it('traduz região e tipo e apara os detalhes', () => {
    expect(avariasParaExibicao([{ zona: 'TETO', tipo: 'TRINCA', descricao: '  fina ' }])).toEqual([
      { regiao: 'Teto', tipo: 'Trinca', descricao: 'fina' },
    ]);
  });

  it('descarta linha sem zona ou sem tipo e aceita a resposta pública (sem id)', () => {
    expect(avariasParaExibicao([{ tipo: 'OUTRO' }, { zona: 'CAPO' }, { zona: 'CAPO', tipo: 'OUTRO' }])).toEqual([
      { regiao: 'Capô', tipo: 'Outro', descricao: undefined },
    ]);
    expect(avariasParaExibicao(undefined)).toEqual([]);
  });
});
