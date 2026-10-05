import { describe, expect, it } from 'vitest';
import type { AvariaResponse } from '@/api/types';
import { MAX_DESCRICAO, avariaSchema, avariasParaFormValues, avariasParaPayload } from './avarias';

describe('avariasParaFormValues', () => {
  it('converte nulos em undefined e mantém posição e vista', () => {
    const resposta: AvariaResponse[] = [
      {
        id: 7,
        zona: 'CAPO',
        tipo: 'AMASSADO',
        descricao: null as never,
        vista: 'TOPO',
        posicao: { x: 0, y: 0.9, z: 1.2 },
        fotoId: null as never,
        fotoUrl: '/x.jpg',
      },
    ];
    const [form] = avariasParaFormValues(resposta);
    expect(form).toEqual({
      id: 7,
      zona: 'CAPO',
      tipo: 'AMASSADO',
      descricao: undefined,
      vista: 'TOPO',
      posicao: { x: 0, y: 0.9, z: 1.2 },
      fotoId: undefined,
    });
    expect(avariaSchema.safeParse(form).success).toBe(true);
  });

  it('descarta item sem zona ou tipo em vez de quebrar o form', () => {
    expect(avariasParaFormValues([{ id: 1, tipo: 'ARRANHAO' }, { id: 2, zona: 'TETO' }])).toEqual([]);
    expect(avariasParaFormValues(undefined)).toEqual([]);
  });
});

describe('avariasParaPayload', () => {
  it('não manda id nem fotoUrl, apara a descrição e omite texto vazio', () => {
    const payload = avariasParaPayload([
      { id: 3, zona: 'TETO', tipo: 'ARRANHAO', descricao: '  risco fino  ', posicao: { x: 1, y: 1, z: 1 } },
      { zona: 'OUTRA', tipo: 'OUTRO', descricao: '   ' },
    ]);
    expect(payload[0]).toEqual({
      zona: 'TETO',
      tipo: 'ARRANHAO',
      descricao: 'risco fino',
      vista: undefined,
      posicao: { x: 1, y: 1, z: 1 },
      fotoId: undefined,
    });
    expect(payload[0]).not.toHaveProperty('id');
    expect(payload[1].descricao).toBeUndefined();
  });
});

describe('avariaSchema', () => {
  it('rejeita descrição acima do limite do backend', () => {
    const base = { zona: 'TETO', tipo: 'ARRANHAO' } as const;
    expect(avariaSchema.safeParse({ ...base, descricao: 'a'.repeat(MAX_DESCRICAO) }).success).toBe(true);
    expect(avariaSchema.safeParse({ ...base, descricao: 'a'.repeat(MAX_DESCRICAO + 1) }).success).toBe(false);
  });

  it('rejeita zona fora do enum', () => {
    expect(avariaSchema.safeParse({ zona: 'PARALAMA_DIANTEIRA_ESQ', tipo: 'ARRANHAO' }).success).toBe(false);
  });
});
